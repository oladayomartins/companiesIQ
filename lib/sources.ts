// ============================================================
// Data sources registry — single source of truth for provenance
// ------------------------------------------------------------
// CompaniesIQ's first principle is "Evidence First": every figure is
// real and sourced. This registry records each source, its provider,
// licence, and — critically — whether it is pulled LIVE from an API
// or used as a published REFERENCE baseline (annual releases with no
// queryable API). The /sources page and in-app source lines render
// from this so provenance is never ambiguous.
// ============================================================

export type SourceStatus = "live" | "reference";

export interface DataSource {
  id: string;
  name: string;
  provider: string;
  status: SourceStatus;
  licence: string;
  url: string;
  powers: string; // what it feeds in the product
  note?: string;
}

export const SOURCES: DataSource[] = [
  {
    id: "companies-house",
    name: "Companies House register",
    provider: "Companies House",
    status: "live",
    licence: "Open Government Licence v3.0",
    url: "https://developer.company-information.service.gov.uk/",
    powers: "Company search, profiles, officers, PSCs, filing history, charges, and all register counts/trends (active, new, dissolved, incorporation trend).",
  },
  {
    id: "nomis-aps",
    name: "Annual Population Survey",
    provider: "Nomis / ONS",
    status: "live",
    licence: "Open Government Licence v3.0",
    url: "https://www.nomisweb.co.uk/",
    powers: "Regional employment rate and economic activity rate (latest period) in the company report's economic indicators.",
  },
  {
    id: "nomis-ashe",
    name: "Annual Survey of Hours & Earnings (ASHE)",
    provider: "Nomis / ONS",
    status: "live",
    licence: "Open Government Licence v3.0",
    url: "https://www.nomisweb.co.uk/",
    powers: "Regional median gross weekly pay in the report's economic indicators and the discover hotspots.",
  },
  {
    id: "nomis-pop",
    name: "Mid-year population estimates",
    provider: "Nomis / ONS",
    status: "live",
    licence: "Open Government Licence v3.0",
    url: "https://www.nomisweb.co.uk/",
    powers: "Regional population in the report's economic indicators.",
  },
  {
    id: "ons-demography",
    name: "Business Demography",
    provider: "Office for National Statistics",
    status: "reference",
    licence: "Open Government Licence v3.0",
    url: "https://www.ons.gov.uk/businessindustryandtrade/business/activitysizeandlocation/bulletins/businessdemography/previousReleases",
    powers: "1/3/5-year business survival benchmarks in the company report.",
    note: "Published as an annual statistical bulletin (no queryable API). Used as an indicative reference baseline by sector; not pulled live.",
  },
  {
    id: "ons-bpe",
    name: "Business Population Estimates",
    provider: "ONS / Dept. for Business & Trade",
    status: "reference",
    licence: "Open Government Licence v3.0",
    url: "https://www.gov.uk/government/collections/business-population-estimates",
    powers: "Sector business population (active companies by sector) and sector growth rates.",
    note: "Annual spreadsheet release (no queryable API). Companies House counts a different universe (registered companies, not the BPE enterprise base), so these are kept as the authoritative sector reference rather than recomputed.",
  },
];

export const LIVE_SOURCES = SOURCES.filter((s) => s.status === "live");
export const REFERENCE_SOURCES = SOURCES.filter((s) => s.status === "reference");

/** Short, dated attribution strings used inline on report sections. */
export const ATTRIBUTION = {
  companiesHouse: "Companies House (live)",
  nomis: "Nomis / ONS (live, latest period)",
  onsDemography: "ONS Business Demography (reference baseline)",
  onsBpe: "ONS Business Population Estimates (reference baseline)",
};
