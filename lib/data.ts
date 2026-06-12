// ============================================================
// Data-access layer
// ------------------------------------------------------------
// The single entry point pages use to fetch company data. Live only:
// everything comes from the Companies House REST API, enriched with
// the keyword + opportunity-scoring engines. No sample/seed data.
// ============================================================
import "server-only";
import type { Company, SearchResult, Officer, Filing, Charge, OfficerProfile, PSC } from "./types";
import * as ch from "./companies-house";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const LIVE = true;

export interface CompanyBundle {
  company: Company;
  officers: Officer[];
  filings: Filing[];
  charges: Charge[];
  pscs: PSC[];
  live: boolean;
}

// Results are plain Companies House facts — no opportunity score, no
// keyword guessing. Factual tags are derived in the UI from these fields.
export type EnrichedResult = SearchResult;

export interface ExploreParams extends ch.AdvancedSearchParams {
  region?: string; // post-filter on resolved region
  regions?: string[]; // multiple selected regions (UI)
  sector?: string; // post-filter on classified sector
}

// Region (ONS) isn't a Companies House search field, so we approximate it with
// a registered-office `location` text search, then refine to the selected
// region(s) from our resolved geo. Works well for nations + named places;
// best-effort for abstract English regions (the register cache is the precise
// path once populated).
const REGION_TO_LOCATION: Record<string, string> = {
  London: "London",
  Scotland: "Scotland",
  Wales: "Wales",
  "Northern Ireland": "Northern Ireland",
};

export async function search(q: string, startIndex = 0): Promise<{ total: number; results: EnrichedResult[]; live: boolean }> {
  const r = q.trim() ? await ch.searchCompanies(q, { perPage: 40, startIndex }) : await ch.advancedSearch({ size: 40, startIndex });
  return { total: r.total, results: r.results, live: true };
}

export async function explore(params: ExploreParams): Promise<{ total: number; results: EnrichedResult[]; live: boolean }> {
  const regions = params.regions?.length ? params.regions : params.region ? [params.region] : [];

  const filtering = regions.length > 0 || !!params.sector;

  // No region/sector refine → one query, keep Companies House's true total.
  if (!filtering) {
    const r = await ch.advancedSearch({ ...params, size: params.size ?? 40 });
    return { total: r.total, results: r.results, live: true };
  }

  // Region (ONS) isn't a Companies House field — we narrow with a `location`
  // text search, then refine to the resolved region. With multiple regions
  // selected, run one location query PER region and merge (a single location
  // can't cover two regions).
  const base: ch.AdvancedSearchParams = { ...params, size: 100 };
  let results: EnrichedResult[];
  if (regions.length && !base.location) {
    const perRegion = await Promise.all(
      regions.map((rg) => ch.advancedSearch({ ...base, location: REGION_TO_LOCATION[rg] ?? rg }))
    );
    const seen = new Set<string>();
    results = perRegion
      .flatMap((r) => r.results)
      .filter((x) => (seen.has(x.number) ? false : (seen.add(x.number), true)));
  } else {
    results = (await ch.advancedSearch(base)).results;
  }

  if (regions.length) results = results.filter((x) => x.region && regions.includes(x.region));
  if (params.sector) results = results.filter((x) => x.classification?.sector === params.sector);

  const start = params.startIndex ?? 0;
  const size = params.size ?? 40;
  return { total: results.length, results: results.slice(start, start + size), live: true };
}

// ============================================================
// Register-cache search (the filing-status filters)
// ------------------------------------------------------------
// Companies House's search API can't filter by filing status, so the
// accountant filters (overdue accounts, accounts due soon, confirmation
// statement due) query CompaniesIQ's own `companies` cache instead — the
// only place filing dates are stored. Coverage grows with the ingest job
// and the backfill script; callers should surface that to the user.
// ============================================================
export interface FilingFilters {
  accountsOverdue?: boolean;
  accountsDueDays?: number; // upcoming accounts due within N days
  confirmationDue?: boolean; // confirmation statement overdue or due within 30 days
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// Request-driven filing search
// ------------------------------------------------------------
// Filing-status filters without a pre-loaded register: run the live Companies
// House search for the current context (region/sector/name/etc.), enrich those
// candidates' filing dates on demand (cached write-through, so repeats are
// instant), then filter by the filing predicate. Finds overdue / due-soon /
// confirmation-due companies WITHIN a search — the realistic accountant flow.
// ============================================================
const FILING_TTL_DAYS = 7;

function isFreshDays(iso: string | null, days: number): boolean {
  if (!iso) return false;
  return Date.now() - Date.parse(iso) < days * 86_400_000;
}

async function mapPoolR<T, R>(items: T[], concurrency: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return out;
}

function matchesFiling(r: EnrichedResult, f: FilingFilters, today: string): boolean {
  if (f.accountsOverdue && !r.accountsOverdue) return false;
  if (f.accountsDueDays) {
    const d = r.accountsNextDue;
    if (!d || d < today || d > addDays(today, f.accountsDueDays)) return false;
  }
  if (f.confirmationDue) {
    const dueSoon = !!r.confirmationNextDue && r.confirmationNextDue >= today && r.confirmationNextDue <= addDays(today, 30);
    if (!r.confirmationOverdue && !dueSoon) return false;
  }
  return true;
}

export async function exploreWithFiling(
  params: ExploreParams,
  filing: FilingFilters,
  ownerNationality?: string
): Promise<{ total: number; results: EnrichedResult[]; live: boolean; cache: true }> {
  // 1. Live candidates for the current search context.
  const base = await explore({ ...params, size: 60 });
  const admin = getSupabaseAdmin();
  const today = isoToday();
  const numbers = base.results.map((r) => r.number);
  const needFiling = !!(filing.accountsOverdue || filing.accountsDueDays || filing.confirmationDue);
  const needPsc = !!ownerNationality;
  const natLc = ownerNationality?.toLowerCase();

  // 2. Reuse fresh cached data; only fetch what's stale/missing.
  const filingCache = new Map<string, Record<string, unknown>>();
  const pscCache = new Map<string, string[]>();
  if (admin && numbers.length) {
    const { data } = await admin
      .from("companies")
      .select(
        "number,accounts_next_due,accounts_overdue,confirmation_next_due,confirmation_overdue,filing_checked_at,psc_nationalities,psc_checked_at"
      )
      .in("number", numbers);
    for (const row of data ?? []) {
      const num = row.number as string;
      if (needFiling && isFreshDays(row.filing_checked_at as string, FILING_TTL_DAYS)) filingCache.set(num, row);
      if (needPsc && isFreshDays(row.psc_checked_at as string, FILING_TTL_DAYS) && Array.isArray(row.psc_nationalities))
        pscCache.set(num, row.psc_nationalities as string[]);
    }
  }

  const cacheRows: Record<string, unknown>[] = [];
  const enriched = await mapPoolR(base.results, 10, async (r): Promise<EnrichedResult> => {
    const out: EnrichedResult = { ...r };
    const write: Record<string, unknown> = {};

    if (needFiling) {
      const hit = filingCache.get(r.number);
      if (hit) {
        out.accountsNextDue = (hit.accounts_next_due as string) ?? undefined;
        out.accountsOverdue = (hit.accounts_overdue as boolean) ?? undefined;
        out.confirmationNextDue = (hit.confirmation_next_due as string) ?? undefined;
        out.confirmationOverdue = (hit.confirmation_overdue as boolean) ?? undefined;
      } else {
        try {
          const c = await ch.getCompany(r.number);
          out.accountsNextDue = c.accounts?.nextDue;
          out.accountsOverdue = c.accounts?.overdue ?? false;
          out.confirmationNextDue = c.confirmationStatement?.nextDue;
          out.confirmationOverdue = c.confirmationStatement?.overdue ?? false;
          Object.assign(write, {
            accounts_next_due: c.accounts?.nextDue ?? null,
            accounts_overdue: c.accounts?.overdue ?? null,
            accounts_last_made_up: c.accounts?.lastMadeUpTo ?? null,
            confirmation_next_due: c.confirmationStatement?.nextDue ?? null,
            confirmation_overdue: c.confirmationStatement?.overdue ?? null,
            filing_checked_at: new Date().toISOString(),
          });
        } catch {
          /* leave un-enriched */
        }
      }
    }

    if (needPsc) {
      const hit = pscCache.get(r.number);
      if (hit) {
        out.pscNationalities = hit;
      } else {
        try {
          const pscs = await ch.getPSCs(r.number);
          const nats = Array.from(
            new Set(pscs.filter((p) => p.active && p.nationality).map((p) => p.nationality as string))
          );
          out.pscNationalities = nats;
          Object.assign(write, { psc_nationalities: nats, psc_checked_at: new Date().toISOString() });
        } catch {
          out.pscNationalities = [];
        }
      }
    }

    if (Object.keys(write).length) {
      cacheRows.push({
        number: r.number,
        name: r.name,
        status: r.status,
        incorporated: r.incorporated ?? null,
        sic_codes: r.sicCodes,
        primary_sector: r.classification?.sector ?? null,
        primary_category: r.classification?.category ?? null,
        region: r.region ?? null,
        postcode: r.postcode ?? null,
        updated_at: new Date().toISOString(),
        ...write,
      });
    }
    return out;
  });

  // 3. Write-through cache (one batch) so repeat searches are instant.
  if (admin && cacheRows.length) {
    try {
      await admin.from("companies").upsert(cacheRows, { onConflict: "number" });
    } catch {
      /* best-effort */
    }
  }

  let matches = enriched;
  if (needFiling) matches = matches.filter((r) => matchesFiling(r, filing, today));
  if (needPsc && natLc) matches = matches.filter((r) => (r.pscNationalities ?? []).some((n) => n.toLowerCase() === natLc));

  const start = params.startIndex ?? 0;
  const size = params.size ?? 40;
  return { total: matches.length, results: matches.slice(start, start + size), live: false, cache: true };
}

export async function getOfficerProfile(officerId: string): Promise<OfficerProfile | null> {
  try {
    return await ch.getOfficerAppointments(officerId);
  } catch (e) {
    if (e instanceof ch.CompaniesHouseError && e.status === 404) return null;
    throw e;
  }
}

export async function getCompanyBundle(number: string): Promise<CompanyBundle | null> {
  try {
    const [company, officers, filings, charges, pscs] = await Promise.all([
      ch.getCompany(number),
      ch.getOfficers(number).catch(() => [] as Officer[]),
      ch.getFilingHistory(number).catch(() => [] as Filing[]),
      ch.getCharges(number).catch(() => [] as Charge[]),
      ch.getPSCs(number).catch(() => [] as PSC[]),
    ]);
    return { company, officers, filings, charges, pscs, live: true };
  } catch (e) {
    if (e instanceof ch.CompaniesHouseError && e.status === 404) return null;
    throw e;
  }
}
