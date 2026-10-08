// ============================================================
// Quarterly incorporations for a sector — live Companies House counts.
//
// A sector is queried as EVERY SIC 2007 code in its divisions
// (allSicCodesForSector), so each bar is a real sector total, not a curated
// subset. Long code lists are split across URL-sized requests and summed
// (countCompaniesAcross); only Manufacturing needs that, and `split` says so
// because a company listing codes in two chunks can be counted twice (~2%).
//
// Cached in Next's data cache for 6 hours, shared by every server instance and
// every page that asks (company reports, /industry, /industry/[sector],
// /app/industries) — so the index page reuses what sector pages already paid
// for. Completed quarters barely move, so 6 hours costs nothing in freshness.
// A failed or rate-limited fetch is NOT cached: it returns null and the next
// render tries again.
// ============================================================
import "server-only";
import { unstable_cache } from "next/cache";
import { countCompaniesAcross } from "./companies-house";
import { allSicCodesForSector } from "./sic";

export interface QuarterPoint {
  /** e.g. "Q3 2024" */
  label: string;
  /** ISO date of the first day of the quarter (machine-readable axis value). */
  from: string;
  value: number;
}

export interface SectorTrend {
  points: QuarterPoint[];
  /** SIC 2007 codes counted — all of the sector's divisions. */
  codeCount: number;
  /** True when the codes needed several requests per quarter (small overcount possible). */
  split: boolean;
}

function quarterWindows(count: number): { label: string; from: string; to: string }[] {
  const now = new Date();
  // Start from the most recently COMPLETED quarter — a part-finished quarter
  // always looks like a collapse and would read as a trend.
  const q = Math.floor(now.getUTCMonth() / 3);
  let year = now.getUTCFullYear();
  let quarter = q - 1;
  if (quarter < 0) {
    quarter = 3;
    year -= 1;
  }
  const out: { label: string; from: string; to: string }[] = [];
  for (let i = 0; i < count; i++) {
    const startMonth = quarter * 3;
    const from = new Date(Date.UTC(year, startMonth, 1));
    const to = new Date(Date.UTC(year, startMonth + 3, 0));
    out.unshift({
      label: `Q${quarter + 1} ${year}`,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    });
    quarter -= 1;
    if (quarter < 0) {
      quarter = 3;
      year -= 1;
    }
  }
  return out;
}

async function compute(sector: string, quarters: number): Promise<SectorTrend | null> {
  const sicCodes = allSicCodesForSector(sector);
  if (sicCodes.length === 0) return null;
  const windows = quarterWindows(quarters);
  // Throws on a Companies House failure, so unstable_cache never stores it.
  const counts = await Promise.all(
    windows.map((w) => countCompaniesAcross({ sicCodes, incorporatedFrom: w.from, incorporatedTo: w.to }))
  );
  // A run of zeroes means the query didn't work, not that nobody incorporated
  // for three years — don't draw a flat line and call it data.
  if (counts.every((c) => c.total === 0)) throw new Error("all-zero trend");
  return {
    points: windows.map((w, i) => ({ label: w.label, from: w.from, value: counts[i].total })),
    codeCount: sicCodes.length,
    split: counts.some((c) => c.requests > 1),
  };
}

const cached = unstable_cache(compute, ["sector-trend-full-sic-v1"], { revalidate: 6 * 3600 });

export async function getSectorFormationTrend(sector: string, quarters = 12): Promise<SectorTrend | null> {
  try {
    return await cached(sector, quarters);
  } catch {
    // Rate-limited or unreachable: omit the chart, keep the page, retry next render.
    return null;
  }
}

/**
 * Live incorporations over the last `quarters` completed quarters — a real
 * sector total (all SIC codes in the sector). null when unavailable.
 */
export function recentTotal(trend: SectorTrend | null, quarters = 4): number | null {
  if (!trend || trend.points.length < quarters) return null;
  return trend.points.slice(-quarters).reduce((t, p) => t + p.value, 0);
}

/** % change of the last `quarters` against the `quarters` before them. */
export function recentChange(trend: SectorTrend | null, quarters = 4): number | null {
  if (!trend || trend.points.length < quarters * 2) return null;
  const now = recentTotal(trend, quarters)!;
  const before = trend.points.slice(-quarters * 2, -quarters).reduce((t, p) => t + p.value, 0);
  return before > 0 ? ((now - before) / before) * 100 : null;
}

/**
 * Trends for many sectors, a few at a time so a cold cache can't burst past
 * Companies House's 600-requests-per-5-minutes limit (4 sectors × 12 quarters
 * ≈ 48 in flight). Warm entries cost nothing.
 */
export async function getSectorFormationTrends(sectors: string[], concurrency = 4): Promise<Map<string, SectorTrend | null>> {
  const out = new Map<string, SectorTrend | null>();
  let next = 0;
  const worker = async () => {
    while (next < sectors.length) {
      const s = sectors[next++];
      out.set(s, await getSectorFormationTrend(s));
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, sectors.length) }, worker));
  return out;
}

/** "all 32 SIC codes in the sector", plus the overcount caveat when it applies. */
export function coverageText(trend: SectorTrend): string {
  return `all ${trend.codeCount} SIC codes in the sector${
    trend.split ? " — a company listing codes in more than one group can be counted twice (~2%)" : ""
  }`;
}

/**
 * The one way a page shows "new registrations" for a sector: the live total
 * of the last four completed quarters when Companies House answered,
 * otherwise the modelled ONS figure — labelled as an estimate, never passed off
 * as a count.
 */
export function newRegistrations(
  trend: SectorTrend | null,
  estimate: number
): { live: boolean; label: string; value: number; display: string; change: number | null; note: string } {
  const live = recentTotal(trend);
  if (live != null)
    return {
      live: true,
      label: "New · last 4 quarters",
      value: live,
      display: live.toLocaleString("en-GB"),
      change: recentChange(trend),
      note: "Companies House, live",
    };
  return {
    live: false,
    label: "New (12m, est.)",
    value: estimate,
    display: `~${estimate.toLocaleString("en-GB")}`,
    change: null,
    note: "ONS estimate",
  };
}
