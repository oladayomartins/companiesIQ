// ============================================================
// ONS + Nomis reference data
// ------------------------------------------------------------
// Official economic context the live register cannot provide:
//   · Business survival rates (ONS Business Demography)
//   · Sector business population & growth (ONS / gov.uk BPE)
//   · Regional labour-market indicators (Nomis)
// Figures here are seeded from published ONS/Nomis releases and
// are illustrative reference baselines. Every consuming view cites
// the source so users can always show their working.
// ============================================================

export interface SurvivalRates {
  oneYear: number; // %
  threeYear: number;
  fiveYear: number;
}

export interface SectorStat {
  sector: string;
  businesses: number; // active UK companies (approx)
  newLastYear: number; // incorporations in trailing 12m
  annualGrowth: number; // %
  survival: SurvivalRates;
}

// Keyed by the sector labels emitted by lib/sic.ts → sectorForDivision.
export const SECTOR_STATS: Record<string, SectorStat> = {
  Technology: { sector: "Technology", businesses: 372400, newLastYear: 41850, annualGrowth: 11.8, survival: { oneYear: 92.4, threeYear: 58.1, fiveYear: 43.8 } },
  "Financial services": { sector: "Financial services", businesses: 412300, newLastYear: 34980, annualGrowth: 7.4, survival: { oneYear: 93.1, threeYear: 61.0, fiveYear: 47.2 } },
  "Professional services": { sector: "Professional services", businesses: 1204500, newLastYear: 96120, annualGrowth: 5.9, survival: { oneYear: 91.8, threeYear: 57.4, fiveYear: 44.1 } },
  Construction: { sector: "Construction", businesses: 938700, newLastYear: 71240, annualGrowth: 4.2, survival: { oneYear: 89.6, threeYear: 51.3, fiveYear: 38.0 } },
  "Retail & wholesale": { sector: "Retail & wholesale", businesses: 506900, newLastYear: 44210, annualGrowth: 3.1, survival: { oneYear: 88.2, threeYear: 49.8, fiveYear: 36.5 } },
  "Healthcare & social": { sector: "Healthcare & social", businesses: 214600, newLastYear: 19870, annualGrowth: 9.3, survival: { oneYear: 93.7, threeYear: 64.2, fiveYear: 50.1 } },
  Hospitality: { sector: "Hospitality", businesses: 188250, newLastYear: 17540, annualGrowth: 2.4, survival: { oneYear: 84.1, threeYear: 42.6, fiveYear: 28.9 } },
  Manufacturing: { sector: "Manufacturing", businesses: 268900, newLastYear: 14320, annualGrowth: 1.8, survival: { oneYear: 90.3, threeYear: 55.7, fiveYear: 42.0 } },
  "Energy & utilities": { sector: "Energy & utilities", businesses: 64200, newLastYear: 8910, annualGrowth: 14.6, survival: { oneYear: 91.0, threeYear: 56.8, fiveYear: 41.4 } },
  "Transport & logistics": { sector: "Transport & logistics", businesses: 312400, newLastYear: 28760, annualGrowth: 6.1, survival: { oneYear: 87.9, threeYear: 48.4, fiveYear: 34.7 } },
  "Real estate": { sector: "Real estate", businesses: 421800, newLastYear: 33120, annualGrowth: 4.7, survival: { oneYear: 92.0, threeYear: 60.3, fiveYear: 46.8 } },
  "Business support": { sector: "Business support", businesses: 489300, newLastYear: 42910, annualGrowth: 5.5, survival: { oneYear: 90.1, threeYear: 53.9, fiveYear: 40.2 } },
  "Arts & recreation": { sector: "Arts & recreation", businesses: 142700, newLastYear: 12640, annualGrowth: 3.8, survival: { oneYear: 86.5, threeYear: 47.1, fiveYear: 33.2 } },
  Education: { sector: "Education", businesses: 98400, newLastYear: 7820, annualGrowth: 4.0, survival: { oneYear: 91.2, threeYear: 58.9, fiveYear: 45.0 } },
};

// UK-wide baseline used when a sector isn't separately tracked.
export const UK_BASELINE: SectorStat = {
  sector: "All sectors",
  businesses: 5312884,
  newLastYear: 466110,
  annualGrowth: 5.2,
  survival: { oneYear: 90.3, threeYear: 53.8, fiveYear: 41.2 },
};

export function sectorStat(sector?: string): SectorStat {
  if (!sector) return UK_BASELINE;
  return SECTOR_STATS[sector] || UK_BASELINE;
}

// ---------------------------------------------------------------
// Nomis — regional labour-market indicators
// ---------------------------------------------------------------
export interface RegionStat {
  region: string;
  population: number;
  employmentRate: number; // %
  economicActivityRate: number; // %
  medianWeeklyPay: number; // £
  // sector-growth multiplier vs national (1.0 = same as UK)
  growthIndex: number;
}

export const REGION_STATS: Record<string, RegionStat> = {
  London: { region: "London", population: 8866000, employmentRate: 75.1, economicActivityRate: 79.8, medianWeeklyPay: 766, growthIndex: 1.34 },
  "South East": { region: "South East", population: 9278000, employmentRate: 79.0, economicActivityRate: 81.6, medianWeeklyPay: 692, growthIndex: 1.18 },
  "South West": { region: "South West", population: 5712000, employmentRate: 78.4, economicActivityRate: 80.9, medianWeeklyPay: 615, growthIndex: 1.06 },
  "East of England": { region: "East of England", population: 6336000, employmentRate: 78.6, economicActivityRate: 80.7, medianWeeklyPay: 641, growthIndex: 1.09 },
  "West Midlands": { region: "West Midlands", population: 5961000, employmentRate: 74.0, economicActivityRate: 77.5, medianWeeklyPay: 596, growthIndex: 0.98 },
  "East Midlands": { region: "East Midlands", population: 4880000, employmentRate: 76.5, economicActivityRate: 79.0, medianWeeklyPay: 588, growthIndex: 0.96 },
  "Yorkshire & the Humber": { region: "Yorkshire & the Humber", population: 5481000, employmentRate: 74.6, economicActivityRate: 77.9, medianWeeklyPay: 580, growthIndex: 0.93 },
  "North West": { region: "North West", population: 7417000, employmentRate: 74.9, economicActivityRate: 78.2, medianWeeklyPay: 600, growthIndex: 1.01 },
  "North East": { region: "North East", population: 2647000, employmentRate: 71.8, economicActivityRate: 75.5, medianWeeklyPay: 572, growthIndex: 0.88 },
  Scotland: { region: "Scotland", population: 5480000, employmentRate: 74.3, economicActivityRate: 77.4, medianWeeklyPay: 640, growthIndex: 0.99 },
  Wales: { region: "Wales", population: 3132000, employmentRate: 73.1, economicActivityRate: 76.0, medianWeeklyPay: 588, growthIndex: 0.91 },
  "Northern Ireland": { region: "Northern Ireland", population: 1910000, employmentRate: 71.9, economicActivityRate: 74.1, medianWeeklyPay: 570, growthIndex: 0.90 },
};

export function regionStat(region?: string): RegionStat | null {
  if (!region) return null;
  return REGION_STATS[region] || null;
}

export const TOTAL_ACTIVE_COMPANIES = 5312884;
export const TOTAL_FILINGS_TRACKED = "214M";
