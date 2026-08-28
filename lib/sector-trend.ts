// ============================================================
// Quarterly incorporations for a sector — an additive, cached series for the
// data-detail archetype's trend chart.
//
// Honest by construction. Companies House can only filter on explicit SIC
// codes, so this counts incorporations across the codes we track in the sector
// (sicCodesForSector), NOT the sector's full SIC division. The returned
// `codeCount` travels with the series so the chart can label what it is
// measuring instead of implying a sector total it cannot produce.
//
// Cached in-module for an hour: the page is ISR'd, so this runs at most once
// per sector per hour rather than on every render, and a rate-limited or failed
// window returns null so the caller omits the chart rather than drawing a
// wrong one.
// ============================================================
import "server-only";
import { countCompanies } from "./companies-house";
import { sicCodesForSector } from "./sic";

export interface QuarterPoint {
  /** e.g. "Q3 2024" */
  label: string;
  /** ISO date of the first day of the quarter (machine-readable axis value). */
  from: string;
  value: number;
}

export interface SectorTrend {
  points: QuarterPoint[];
  codeCount: number;
}

const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: SectorTrend | null }>();

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

export async function getSectorFormationTrend(sector: string, quarters = 12): Promise<SectorTrend | null> {
  const hit = cache.get(sector);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  const sicCodes = sicCodesForSector(sector);
  if (sicCodes.length === 0) {
    cache.set(sector, { at: Date.now(), data: null });
    return null;
  }

  try {
    const windows = quarterWindows(quarters);
    const counts = await Promise.all(
      windows.map((w) => countCompanies({ sicCodes, incorporatedFrom: w.from, incorporatedTo: w.to }))
    );
    // A run of zeroes means the query didn't work, not that nobody incorporated
    // for three years — don't draw a flat line and call it data.
    if (counts.every((n) => n === 0)) {
      cache.set(sector, { at: Date.now(), data: null });
      return null;
    }
    const data: SectorTrend = {
      points: windows.map((w, i) => ({ label: w.label, from: w.from, value: counts[i] })),
      codeCount: sicCodes.length,
    };
    cache.set(sector, { at: Date.now(), data });
    return data;
  } catch {
    // Rate-limited or unreachable: omit the chart, keep the page.
    cache.set(sector, { at: Date.now(), data: null });
    return null;
  }
}
