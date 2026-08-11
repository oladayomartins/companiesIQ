// Client-safe option lists for the free-alert opt-in form. Values must match
// what lib/data.ts `explore()` expects: sector = classified sector NAME,
// region = region NAME. Kept in sync with SECTOR_STATS / REGION_STATS (lib/ons).
// Empty value ("") = "all — anywhere / any sector".

export const ALERT_SECTORS: { label: string; value: string }[] = [
  { label: "Any sector", value: "" },
  { label: "Technology", value: "Technology" },
  { label: "Financial services", value: "Financial services" },
  { label: "Professional services", value: "Professional services" },
  { label: "Construction", value: "Construction" },
  { label: "Retail & wholesale", value: "Retail & wholesale" },
  { label: "Healthcare & social", value: "Healthcare & social" },
  { label: "Hospitality", value: "Hospitality" },
  { label: "Manufacturing", value: "Manufacturing" },
  { label: "Energy & utilities", value: "Energy & utilities" },
  { label: "Transport & logistics", value: "Transport & logistics" },
  { label: "Real estate", value: "Real estate" },
  { label: "Business support", value: "Business support" },
  { label: "Arts & recreation", value: "Arts & recreation" },
  { label: "Education", value: "Education" },
];

export const ALERT_REGIONS: { label: string; value: string }[] = [
  { label: "Anywhere in the UK", value: "" },
  { label: "London", value: "London" },
  { label: "South East", value: "South East" },
  { label: "South West", value: "South West" },
  { label: "East of England", value: "East of England" },
  { label: "West Midlands", value: "West Midlands" },
  { label: "East Midlands", value: "East Midlands" },
  { label: "Yorkshire & the Humber", value: "Yorkshire & the Humber" },
  { label: "North West", value: "North West" },
  { label: "North East", value: "North East" },
  { label: "Scotland", value: "Scotland" },
  { label: "Wales", value: "Wales" },
  { label: "Northern Ireland", value: "Northern Ireland" },
];

/** Human label for a chosen (sector, region) pair — used in copy + emails. */
export function alertScopeLabel(sector?: string | null, region?: string | null): string {
  const s = sector ? sector.toLowerCase() : "new";
  const r = region ? ` in ${region}` : " across the UK";
  return `${s} companies${r}`;
}
