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
import { classifySic } from "@/lib/sic";

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

export async function search(q: string): Promise<{ total: number; results: EnrichedResult[]; live: boolean }> {
  const r = q.trim() ? await ch.searchCompanies(q, { perPage: 40 }) : await ch.advancedSearch({ size: 40 });
  return { total: r.total, results: r.results, live: true };
}

export async function explore(params: ExploreParams): Promise<{ total: number; results: EnrichedResult[]; live: boolean }> {
  const regions = params.regions?.length ? params.regions : params.region ? [params.region] : [];

  // Narrow at Companies House with a location text search when one region is
  // selected (so results aren't dominated by CH's default ordering), then
  // post-filter to the resolved region(s). Fetch a wider page when filtering by
  // region/sector so enough candidates survive the refine.
  const chParams: ch.AdvancedSearchParams = { ...params };
  if (regions.length === 1 && !chParams.location) {
    chParams.location = REGION_TO_LOCATION[regions[0]] ?? regions[0];
  }
  if ((regions.length || params.sector) && (chParams.size ?? 0) < 100) {
    chParams.size = 100;
  }

  const r = await ch.advancedSearch(chParams);
  let results = r.results;
  let total = r.total;
  if (regions.length) {
    results = results.filter((x) => x.region && regions.includes(x.region));
    total = results.length;
  }
  if (params.sector) {
    results = results.filter((x) => x.classification?.sector === params.sector);
    total = results.length;
  }
  return { total, results: results.slice(0, params.size ?? 40), live: true };
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

export interface LocalExploreParams extends FilingFilters {
  q?: string;
  status?: string[];
  sicCodes?: string[];
  sector?: string;
  region?: string;
  regions?: string[];
  incorporatedFrom?: string;
  size?: number;
  startIndex?: number;
}

export function hasFilingFilter(f: FilingFilters): boolean {
  return !!(f.accountsOverdue || f.accountsDueDays || f.confirmationDue);
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface CompanyRow {
  number: string;
  name: string;
  status: string | null;
  type: string | null;
  incorporated: string | null;
  sic_codes: string[] | null;
  primary_sector: string | null;
  region: string | null;
  postcode: string | null;
  accounts_next_due: string | null;
  accounts_overdue: boolean | null;
  confirmation_next_due: string | null;
  confirmation_overdue: boolean | null;
}

function mapRow(row: CompanyRow): EnrichedResult {
  const sic = row.sic_codes ?? [];
  return {
    number: row.number,
    name: row.name,
    status: row.status ?? "active",
    incorporated: row.incorporated ?? undefined,
    sicCodes: sic,
    classification: sic[0] ? classifySic(sic[0]) : undefined,
    region: row.region ?? undefined,
    postcode: row.postcode ?? undefined,
    companyType: row.type ?? undefined,
    accountsNextDue: row.accounts_next_due ?? undefined,
    accountsOverdue: row.accounts_overdue ?? undefined,
    confirmationNextDue: row.confirmation_next_due ?? undefined,
    confirmationOverdue: row.confirmation_overdue ?? undefined,
  };
}

export async function exploreLocal(
  params: LocalExploreParams
): Promise<{ total: number; results: EnrichedResult[]; live: boolean; cache: true }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { total: 0, results: [], live: false, cache: true };

  const size = params.size ?? 40;
  const start = params.startIndex ?? 0;
  const today = isoToday();

  let query = admin
    .from("companies")
    .select(
      "number,name,status,type,incorporated,sic_codes,primary_sector,region,postcode,accounts_next_due,accounts_overdue,confirmation_next_due,confirmation_overdue",
      { count: "exact" }
    );

  if (params.q) query = query.ilike("name", `%${params.q}%`);
  if (params.status?.length) query = query.in("status", params.status);
  if (params.sector) query = query.eq("primary_sector", params.sector);
  const regions = params.regions?.length ? params.regions : params.region ? [params.region] : [];
  if (regions.length === 1) query = query.eq("region", regions[0]);
  else if (regions.length > 1) query = query.in("region", regions);
  if (params.sicCodes?.length) query = query.overlaps("sic_codes", params.sicCodes);
  if (params.incorporatedFrom) query = query.gte("incorporated", params.incorporatedFrom);

  // Filing filters (the whole point of this path).
  if (params.accountsOverdue) query = query.eq("accounts_overdue", true);
  if (params.accountsDueDays) {
    // Upcoming: due date between today and today+N (overdue ones sit in the past).
    query = query.gte("accounts_next_due", today).lte("accounts_next_due", addDays(today, params.accountsDueDays));
  }
  if (params.confirmationDue) {
    query = query.or(
      `confirmation_overdue.eq.true,and(confirmation_next_due.gte.${today},confirmation_next_due.lte.${addDays(today, 30)})`
    );
  }

  query = hasFilingFilter(params)
    ? query.order("accounts_next_due", { ascending: true, nullsFirst: false })
    : query.order("incorporated", { ascending: false, nullsFirst: false });

  const { data, count, error } = await query.range(start, start + size - 1);
  if (error || !data) return { total: 0, results: [], live: false, cache: true };

  return { total: count ?? data.length, results: (data as CompanyRow[]).map(mapRow), live: false, cache: true };
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
