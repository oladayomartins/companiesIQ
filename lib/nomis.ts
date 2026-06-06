// ============================================================
// Nomis API client — live regional labour-market indicators
// ------------------------------------------------------------
// Nomis (ONS) exposes a free JSON API. We pull, per ITL1 region:
//   · population            (NM_31_1 mid-year estimates, all ages)
//   · employment rate       (NM_17_5 APS, variable 45)
//   · economic activity     (NM_17_5 APS, variable 18)
//   · median weekly pay     (NM_30_1 ASHE resident, median gross weekly)
// Cached daily. Falls back to null on any error so callers can use
// the ONS reference baselines instead — the app never breaks.
//
// Source: Nomis / ONS Crown Copyright.
// ============================================================
import "server-only";

const BASE = "https://www.nomisweb.co.uk/api/v01/dataset";
const GEO = "2013265921...2013265932"; // the 12 ITL1 regions (English regions + Scotland/Wales/NI)

// Stable ONS geography codes → CompaniesIQ region keys.
const CODE_TO_REGION: Record<string, string> = {
  E12000001: "North East",
  E12000002: "North West",
  E12000003: "Yorkshire & the Humber",
  E12000004: "East Midlands",
  E12000005: "West Midlands",
  E12000006: "East of England",
  E12000007: "London",
  E12000008: "South East",
  E12000009: "South West",
  W92000004: "Wales",
  S92000003: "Scotland",
  N92000002: "Northern Ireland",
};

export interface RegionLive {
  population: number;
  employmentRate: number;
  economicActivityRate: number;
  medianWeeklyPay: number;
}

interface NomisObs {
  geography: { geogcode: string };
  obs_value: { value: number | null };
}

async function fetchSeries(path: string): Promise<Record<string, number>> {
  const res = await fetch(`${BASE}/${path}`, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Nomis ${res.status}`);
  const data = (await res.json()) as { obs?: NomisObs[] };
  const out: Record<string, number> = {};
  for (const o of data.obs || []) {
    const region = CODE_TO_REGION[o.geography?.geogcode];
    const v = o.obs_value?.value;
    if (region && v != null) out[region] = v;
  }
  return out;
}

/** Live regional indicators keyed by region name; null on failure. */
export async function getRegionIndicators(): Promise<Record<string, RegionLive> | null> {
  try {
    const [pop, emp, act, pay] = await Promise.all([
      fetchSeries(`NM_31_1.data.json?geography=${GEO}&date=latest&sex=7&age=0&measures=20100&select=geography_code,obs_value`),
      fetchSeries(`NM_17_5.data.json?geography=${GEO}&date=latest&variable=45&measures=20599&select=geography_code,obs_value`),
      fetchSeries(`NM_17_5.data.json?geography=${GEO}&date=latest&variable=18&measures=20599&select=geography_code,obs_value`),
      fetchSeries(`NM_30_1.data.json?geography=${GEO}&date=latest&sex=8&item=2&pay=1&measures=20100&select=geography_code,obs_value`),
    ]);
    const out: Record<string, RegionLive> = {};
    for (const region of Object.values(CODE_TO_REGION)) {
      if (pop[region] == null && emp[region] == null) continue;
      out[region] = {
        population: pop[region] ?? 0,
        employmentRate: emp[region] ?? 0,
        economicActivityRate: act[region] ?? 0,
        medianWeeklyPay: pay[region] ?? 0,
      };
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/** Convenience: live indicators for one region (null if unavailable). */
export async function getRegionLive(region?: string): Promise<RegionLive | null> {
  if (!region) return null;
  const all = await getRegionIndicators();
  return all?.[region] ?? null;
}
