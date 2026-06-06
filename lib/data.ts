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
  sector?: string; // post-filter on classified sector
}

export async function search(q: string): Promise<{ total: number; results: EnrichedResult[]; live: boolean }> {
  const r = q.trim() ? await ch.searchCompanies(q, { perPage: 40 }) : await ch.advancedSearch({ size: 40 });
  return { total: r.total, results: r.results, live: true };
}

export async function explore(params: ExploreParams): Promise<{ total: number; results: EnrichedResult[]; live: boolean }> {
  const r = await ch.advancedSearch(params);
  let results = r.results;
  let total = r.total;
  if (params.region) {
    results = results.filter((x) => x.region === params.region);
    total = results.length;
  }
  if (params.sector) {
    results = results.filter((x) => x.classification?.sector === params.sector);
    total = results.length;
  }
  return { total, results, live: true };
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
