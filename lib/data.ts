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
import { allSicCodesForSector } from "./sic";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getCompanyFinancials } from "./enrichment/financials";

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
  /** Query a sector as all its SIC codes instead of post-filtering a
   *  location sample — gives Companies House's real total. Opt-in (on-site
   *  search) so pages built on the sampled behaviour don't change silently. */
  sectorBySic?: boolean;
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

// English regions never appear in an address, so searching the region's name
// finds almost nothing ("North West" matched 9 software companies nationally;
// "Manchester" alone matched 1,589). Each region is searched instead by the
// words its addresses DO contain — its biggest cities and its counties — one
// Companies House query per term, merged, de-duplicated, and kept only when
// the postcode resolves to the region (which drops "Manchester Road, Bradford"
// and Newcastle-under-Lyme). Six terms per region, ordered by yield, chosen
// from measured hit counts; each call sits in the shared data cache.
const REGION_TERMS: Record<string, string[]> = {
  "North West": ["Manchester", "Liverpool", "Lancashire", "Cheshire", "Merseyside", "Cumbria"],
  "North East": ["Newcastle", "Sunderland", "Middlesbrough", "Durham", "Tyne and Wear", "Northumberland"],
  "Yorkshire & the Humber": ["Leeds", "Sheffield", "Bradford", "Hull", "Yorkshire", "Huddersfield"],
  "East Midlands": ["Nottingham", "Leicester", "Derby", "Northampton", "Lincolnshire", "Leicestershire"],
  "West Midlands": ["Birmingham", "West Midlands", "Coventry", "Wolverhampton", "Staffordshire", "Warwickshire"],
  "East of England": ["Essex", "Hertfordshire", "Norfolk", "Suffolk", "Cambridgeshire", "Bedfordshire"],
  "South East": ["Kent", "Surrey", "Sussex", "Hampshire", "Berkshire", "Oxfordshire"],
  "South West": ["Bristol", "Devon", "Cornwall", "Somerset", "Dorset", "Gloucestershire"],
};

/** Location terms that cover a region on the register. */
function regionTerms(region: string): string[] {
  return REGION_TO_LOCATION[region] ? [REGION_TO_LOCATION[region]] : REGION_TERMS[region] ?? [region];
}

/** Rows per term when sweeping a region — enough to fill several pages once merged. */
const REGION_TERM_SIZE = 100;

/**
 * Run one search per location term for the selected region(s), merge, and keep
 * only rows whose postcode resolves to one of them. A term that fails (quota,
 * upstream) is skipped rather than failing the whole search.
 */
async function sweepRegions(
  regions: string[],
  run: (location: string) => Promise<{ results: EnrichedResult[] }>
): Promise<EnrichedResult[]> {
  const terms = [...new Set(regions.flatMap(regionTerms))];
  const settled = await Promise.allSettled(terms.map(run));
  const ok = settled.filter((r): r is PromiseFulfilledResult<{ results: EnrichedResult[] }> => r.status === "fulfilled");
  if (!ok.length) {
    const failed = settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
    throw failed?.reason ?? new Error("Region search failed");
  }
  const seen = new Set<string>();
  return ok
    .flatMap((r) => r.value.results)
    .filter((x) => x.region && regions.includes(x.region))
    .filter((x) => (seen.has(x.number) ? false : (seen.add(x.number), true)))
    .sort((a, b) => (b.incorporated ?? "").localeCompare(a.incorporated ?? ""));
}

export async function search(q: string, startIndex = 0): Promise<{ total: number; results: EnrichedResult[]; live: boolean }> {
  const r = q.trim() ? await ch.searchCompanies(q, { perPage: 40, startIndex }) : await ch.advancedSearch({ size: 40, startIndex });
  return { total: r.total, results: r.results, live: true };
}

export async function explore(params: ExploreParams): Promise<{ total: number; results: EnrichedResult[]; live: boolean; exact?: boolean }> {
  const regions = params.regions?.length ? params.regions : params.region ? [params.region] : [];

  // Sector as SIC codes: Companies House filters and counts it, so the total is
  // real. Only a region post-filter (abstract English regions) makes it a sample.
  if (params.sectorBySic && params.sector && !params.sicCodes?.length) {
    // Every SIC code in the sector, so the total is the real sector total (and
    // matches the market header above the results).
    const sicCodes = allSicCodesForSector(params.sector);
    if (sicCodes.length) {
      const regionText = regions.length === 1 ? REGION_TO_LOCATION[regions[0]] : undefined;
      const needsRegionFilter = regions.length > 0 && !params.location && !regionText;
      if (!needsRegionFilter) {
        // One London/nation region, or an explicit town: Companies House counts it exactly.
        const r = await ch.advancedSearchAcross({ ...params, sicCodes, location: params.location ?? regionText, size: params.size ?? 40 });
        return { total: r.total, results: r.results, live: true, exact: true };
      }
      const inRegion = await sweepRegions(regions, (location) =>
        ch.advancedSearchAcross({ ...params, sicCodes, location, startIndex: 0, size: REGION_TERM_SIZE })
      );
      const start = params.startIndex ?? 0;
      return { total: inRegion.length, results: inRegion.slice(start, start + (params.size ?? 40)), live: true, exact: false };
    }
  }

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
  // One London/nation region with no sector refine: the region's name IS in its
  // addresses, so Companies House filters and counts it exactly — no sweep.
  if (regions.length === 1 && !params.sector && !params.location && REGION_TO_LOCATION[regions[0]]) {
    const r = await ch.advancedSearch({ ...params, location: REGION_TO_LOCATION[regions[0]], size: params.size ?? 40 });
    return { total: r.total, results: r.results, live: true, exact: true };
  }

  const base: ch.AdvancedSearchParams = { ...params, startIndex: 0, size: REGION_TERM_SIZE };
  let results: EnrichedResult[];
  if (regions.length && !base.location) {
    results = await sweepRegions(regions, (location) => ch.advancedSearch({ ...base, location }));
  } else {
    results = (await ch.advancedSearch(base)).results;
    if (regions.length) results = results.filter((x) => x.region && regions.includes(x.region));
  }
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
  // Financials (from filed accounts, iXBRL). Filter candidates by size/health.
  minNetWorth?: number; // £ net assets
  minTurnover?: number; // £ turnover
  minEmployees?: number;
  hasAccounts?: boolean; // has machine-readable filed accounts
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

// A candidate must have the relevant figure AND meet the threshold — unknowns
// are excluded (we can't confirm a company we couldn't assess meets a size bar).
function matchesFinancial(r: EnrichedResult, f: FilingFilters): boolean {
  if (f.hasAccounts && !r.finAccountsType) return false;
  if (f.minNetWorth != null && !(r.finNetAssets != null && r.finNetAssets >= f.minNetWorth)) return false;
  if (f.minTurnover != null && !(r.finTurnover != null && r.finTurnover >= f.minTurnover)) return false;
  if (f.minEmployees != null && !(r.finEmployees != null && r.finEmployees >= f.minEmployees)) return false;
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
  const needFin = filing.minNetWorth != null || filing.minTurnover != null || filing.minEmployees != null || !!filing.hasAccounts;
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

    if (needFin) {
      // getCompanyFinancials is cache-first + writes its own cache, so repeats
      // are free; first time it costs a few CH calls per uncached candidate.
      const fin = await getCompanyFinancials(r.number, { name: r.name });
      out.finNetAssets = fin.netAssets;
      out.finTurnover = fin.turnover;
      out.finEmployees = fin.employees;
      out.finAccountsType = fin.accountsType;
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
  if (needFin) matches = matches.filter((r) => matchesFinancial(r, filing));
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

/** Our stored copy of a company (Supabase `companies`, written by the ingest
 *  job and enrichment). Only what the row actually holds — nothing inferred. */
export interface StoredCompany {
  number: string;
  name: string;
  status: string;
  type: string | null;
  incorporated: string;
  dissolved: string | null;
  sicCodes: string[];
  sector: string | null;
  category: string | null;
  region: string | null;
  nation: string | null;
  postcode: string | null;
  accountsNextDue: string | null;
  accountsOverdue: boolean | null;
  confirmationNextDue: string | null;
  confirmationOverdue: boolean | null;
  filingCheckedAt: string | null;
  updatedAt: string | null;
}

/**
 * The stored copy, for when Companies House is rate-limiting us. Returns null
 * unless the row is substantial enough to stand as a labelled partial page:
 * many rows hold only a number and name (written by other features), and a
 * near-empty page served to a crawler is worse than a temporary error.
 */
export async function getStoredCompany(number: string): Promise<StoredCompany | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin
    .from("companies")
    .select(
      "number,name,status,type,incorporated,dissolved,sic_codes,primary_sector,primary_category,region,nation,postcode,accounts_next_due,accounts_overdue,confirmation_next_due,confirmation_overdue,filing_checked_at,updated_at"
    )
    .eq("number", number.toUpperCase())
    .maybeSingle();
  if (error || !data || !data.name || !data.status || !data.incorporated) return null;
  return {
    number: data.number,
    name: data.name,
    status: data.status,
    type: data.type ?? null,
    incorporated: data.incorporated,
    dissolved: data.dissolved ?? null,
    sicCodes: data.sic_codes ?? [],
    sector: data.primary_sector ?? null,
    category: data.primary_category ?? null,
    region: data.region ?? null,
    nation: data.nation ?? null,
    postcode: data.postcode ?? null,
    accountsNextDue: data.accounts_next_due ?? null,
    accountsOverdue: data.accounts_overdue ?? null,
    confirmationNextDue: data.confirmation_next_due ?? null,
    confirmationOverdue: data.confirmation_overdue ?? null,
    filingCheckedAt: data.filing_checked_at ?? null,
    updatedAt: data.updated_at ?? null,
  };
}
