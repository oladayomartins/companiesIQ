// ============================================================
// Analytics engine
// ------------------------------------------------------------
// The intelligence layer. Aggregates company data and combines it
// with ONS/Nomis reference baselines to produce:
//   · the 8-section Company Intelligence Report
//   · trend-dashboard series (incorporations, sector breakdown)
//   · industry-intelligence summaries
// Every output is evidence-first and carries its source so the UI
// can attribute it. No fabricated, un-sourced claims.
// ============================================================
import type { Company } from "./types";
import { sectorStat, regionStat, REGION_STATS, SECTOR_STATS, UK_BASELINE } from "./ons";
import { yearsSince } from "./format";

export type Density = "Low" | "Moderate" | "High" | "Very high";

export interface ReportSection {
  source: string;
}

export interface IntelligenceReport {
  overview: {
    name: string;
    number: string;
    incorporated?: string;
    classification: string;
    sector: string;
    location: string;
    type?: string;
  };
  industry: ReportSection & {
    sector: string;
    businesses: number;
    newLastYear: number;
    annualGrowth: number;
  };
  local: ReportSection & {
    region: string;
    inSameIndustry: number;
    newEntrants: number;
    density: Density;
  };
  survival: ReportSection & {
    oneYear: number;
    threeYear: number;
    fiveYear: number;
  };
  regional: ReportSection & {
    nationalGrowth: number;
    regionalGrowth: number;
    insight: string;
  };
  economic: ReportSection & {
    region: string;
    population: number;
    employmentRate: number;
    economicActivityRate: number;
    medianWeeklyPay: number;
  };
  trends: ReportSection & {
    trajectory: string;
    concentration: string;
    emerging: string;
    momentum: string;
  };
  outlook: ReportSection & { items: string[] };
}

/** Share of UK companies a region holds, by population weight. */
function regionShare(region: string): number {
  const r = REGION_STATS[region];
  if (!r) return 0.05;
  const total = Object.values(REGION_STATS).reduce((a, x) => a + x.population, 0);
  return r.population / total;
}

function densityFromCount(n: number): Density {
  if (n < 120) return "Low";
  if (n < 600) return "Moderate";
  if (n < 2500) return "High";
  return "Very high";
}

export interface EconomicLive {
  population: number;
  employmentRate: number;
  economicActivityRate: number;
  medianWeeklyPay: number;
}

export function buildIntelligenceReport(company: Company, economicLive?: EconomicLive | null): IntelligenceReport {
  const sector = company.primaryClassification?.sector || "All sectors";
  const category = company.primaryClassification?.category || "Unclassified";
  const region = company.geo?.region && company.geo.region !== "Unknown" ? company.geo.region : "United Kingdom";
  const stat = sectorStat(sector);
  const reg = regionStat(region);
  const share = regionShare(region);

  // Local market estimate: sector businesses weighted by region's share,
  // adjusted by the region's growth index. Derived figure — labelled as such.
  const inSameIndustry = Math.round(stat.businesses * share * (reg?.growthIndex ?? 1));
  const newEntrants = Math.round(stat.newLastYear * share * (reg?.growthIndex ?? 1));

  // Regional growth = national sector growth scaled by the region's index.
  const nationalGrowth = stat.annualGrowth;
  const regionalGrowth = +(nationalGrowth * (reg?.growthIndex ?? 1)).toFixed(1);

  let insight: string;
  if (regionalGrowth > nationalGrowth + 0.5) {
    insight = `This sector is growing faster in ${region} than nationally — a regional tailwind worth tracking.`;
  } else if (regionalGrowth < nationalGrowth - 0.5) {
    insight = `This sector is growing more slowly in ${region} than the national average — expect tighter local competition.`;
  } else {
    insight = `This sector is growing roughly in line with the national average in ${region}.`;
  }

  const age = yearsSince(company.incorporated);

  return {
    overview: {
      name: company.name,
      number: company.number,
      incorporated: company.incorporated,
      classification: category,
      sector,
      location: region,
      type: company.type,
    },
    industry: {
      source: "ONS Business Population Estimates (reference baseline)",
      sector,
      businesses: stat.businesses,
      newLastYear: stat.newLastYear,
      annualGrowth: stat.annualGrowth,
    },
    local: {
      source: "Derived · ONS BPE × registered-office region share",
      region,
      inSameIndustry,
      newEntrants,
      density: densityFromCount(inSameIndustry),
    },
    survival: {
      source: "ONS Business Demography (reference baseline)",
      oneYear: stat.survival.oneYear,
      threeYear: stat.survival.threeYear,
      fiveYear: stat.survival.fiveYear,
    },
    regional: {
      source: "Derived · ONS BPE growth × Nomis regional index",
      nationalGrowth,
      regionalGrowth,
      insight,
    },
    economic: {
      source: economicLive ? "Nomis (live, latest period)" : "Nomis + ONS (reference)",
      region,
      population: economicLive?.population ?? reg?.population ?? 0,
      employmentRate: economicLive?.employmentRate ?? reg?.employmentRate ?? 0,
      economicActivityRate: economicLive?.economicActivityRate ?? reg?.economicActivityRate ?? 0,
      medianWeeklyPay: economicLive?.medianWeeklyPay ?? reg?.medianWeeklyPay ?? 0,
    },
    trends: {
      source: "Derived · ONS BPE sector growth + regional weighting",
      trajectory:
        stat.annualGrowth > 8
          ? "Strong upward — incorporations are accelerating year on year."
          : stat.annualGrowth > 3
            ? "Steady growth — incorporations rising at a measured pace."
            : "Flat to modest — incorporations broadly stable.",
      concentration:
        share > 0.13
          ? `Highly concentrated in ${region} relative to other regions.`
          : `Moderately distributed; ${region} holds about ${(share * 100).toFixed(0)}% of UK activity.`,
      emerging:
        (reg?.growthIndex ?? 1) > 1.1
          ? `${region} is an above-average growth location for this sector.`
          : `Growth is more evenly spread across regions for this sector.`,
      momentum: age != null && age < 2 ? "Newly incorporated — establishing momentum." : "Established presence in the sector.",
    },
    outlook: {
      source: "Derived · Companies House, ONS & Nomis",
      items: [
        `${region} is a ${densityFromCount(inSameIndustry).toLowerCase()}-density market for ${sector.toLowerCase()}, with about ${fmtNumberLocal(inSameIndustry)} companies in the same industry.`,
        regionalGrowth > nationalGrowth + 0.5
          ? `Formation is running ahead of the national average here (${fmtDeltaLocal(regionalGrowth)} vs ${fmtDeltaLocal(nationalGrowth)}), pointing to a regional tailwind.`
          : regionalGrowth < nationalGrowth - 0.5
            ? `Formation is slower than the national average here (${fmtDeltaLocal(regionalGrowth)} vs ${fmtDeltaLocal(nationalGrowth)}), suggesting a maturing local market.`
            : `Formation is broadly in line with the national average (${fmtDeltaLocal(regionalGrowth)}).`,
        `Around ${fmtNumberLocal(newEntrants)} new companies registered in this industry locally over the last year.`,
        `Sector survival sits at ${stat.survival.fiveYear.toFixed(0)}% over five years — the benchmark for businesses in this classification.`,
      ],
    },
  };
}

function fmtNumberLocal(n: number): string {
  return n.toLocaleString("en-GB");
}

function fmtDeltaLocal(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// ---------------------------------------------------------------
// Trend dashboard / analytics screen series
// ---------------------------------------------------------------
export interface SectorBreakdownItem {
  name: string;
  count: number;
  share: number; // 0..1 of the max
  formatted: string;
}

export function sectorBreakdown(): SectorBreakdownItem[] {
  const items = Object.values(SECTOR_STATS)
    .map((s) => ({ name: s.sector, count: s.businesses }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const max = items[0]?.count ?? 1;
  return items.map((it) => ({
    name: it.name,
    count: it.count,
    share: it.count / max,
    formatted: it.count.toLocaleString("en-GB"),
  }));
}

export interface RegionBreakdownItem {
  region: string;
  population: number;
  growthIndex: number;
  share: number;
}
export function regionBreakdown(): RegionBreakdownItem[] {
  const items = Object.values(REGION_STATS);
  const max = Math.max(...items.map((r) => r.growthIndex));
  return items
    .map((r) => ({ region: r.region, population: r.population, growthIndex: r.growthIndex, share: r.growthIndex / max }))
    .sort((a, b) => b.growthIndex - a.growthIndex);
}

/** UK 5-year business survival rate (ONS Business Demography reference). */
export const UK_SURVIVAL_5YR = `${UK_BASELINE.survival.fiveYear.toFixed(1)}%`;

export function fastestGrowingSectors(n = 5): { sector: string; growth: number }[] {
  return Object.values(SECTOR_STATS)
    .map((s) => ({ sector: s.sector, growth: s.annualGrowth }))
    .sort((a, b) => b.growth - a.growth)
    .slice(0, n);
}
