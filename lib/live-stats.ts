// ============================================================
// Live register statistics
// ------------------------------------------------------------
// Real aggregates computed from the Companies House advanced-search
// API (hit counts + recent listings). No seed data. Used by the
// dashboard and analytics. Results are cached by the CH client's
// revalidate window, so repeated page loads don't re-hit the API.
// ============================================================
import "server-only";
import { countCompanies, advancedSearch, isoDaysAgo } from "./companies-house";
import { explore, type EnrichedResult } from "./data";
import { fastestGrowingSectors, regionBreakdown } from "./analytics";
import { classifySic } from "./sic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface RegisterKpis {
  active: number;
  incorporations: number;
  dissolutions: number;
  netNew: number;
  days: number;
}

/** Register KPIs over a window (days). Active total is window-independent. */
export async function getRegisterKpis(days = 30): Promise<RegisterKpis> {
  const from = isoDaysAgo(days);
  const to = isoDaysAgo(0);
  const [active, incorporations, dissolutions] = await Promise.all([
    countCompanies({ status: ["active"] }),
    countCompanies({ incorporatedFrom: from, incorporatedTo: to }),
    countCompanies({ dissolvedFrom: from, dissolvedTo: to }),
  ]);
  return { active, incorporations, dissolutions, netNew: incorporations - dissolutions, days };
}

/** Recently incorporated companies (live), enriched + scored, within the window. */
export async function getRecentIncorporations(size = 8, days = 30): Promise<EnrichedResult[]> {
  const r = await explore({ incorporatedFrom: isoDaysAgo(Math.min(days, 30)), incorporatedTo: isoDaysAgo(0), status: ["active"], size });
  return r.results.slice(0, size);
}

/** Recently dissolved companies (live), within the window. */
export async function getRecentDissolutions(size = 6, days = 30): Promise<EnrichedResult[]> {
  const r = await explore({ dissolvedFrom: isoDaysAgo(Math.min(days, 30)), dissolvedTo: isoDaysAgo(0), status: ["dissolved"], size });
  return r.results.slice(0, size);
}

/** Real monthly incorporation counts for the trailing 12 months. */
export async function getIncorporationTrend(): Promise<{ month: string; value: number }[]> {
  const now = new Date();
  const windows: { month: string; from: string; to: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0));
    windows.push({
      month: MONTHS[start.getUTCMonth()],
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
    });
  }
  const counts = await Promise.all(windows.map((w) => countCompanies({ incorporatedFrom: w.from, incorporatedTo: w.to })));
  return windows.map((w, i) => ({ month: w.month, value: counts[i] }));
}

// ---------------------------------------------------------------
// Activity breakdowns from a live sample of recent incorporations.
// Factual counts (region / SIC), not keyword guesses.
// ---------------------------------------------------------------
export interface CountItem {
  key: string;
  label: string;
  count: number;
  share: number;
}

function topCounts(pairs: [string, number][], labels?: Record<string, string>, n = 6): CountItem[] {
  const sorted = pairs.sort((a, b) => b[1] - a[1]).slice(0, n);
  const max = sorted[0]?.[1] ?? 1;
  return sorted.map(([key, count]) => ({ key, label: labels?.[key] ?? key, count, share: count / max }));
}

export interface ActivityBreakdown {
  regions: CountItem[];
  sics: CountItem[];
  sampleSize: number;
  days: number;
}

/** Most active regions + most-registered SIC codes among recent incorporations. */
export async function getActivityBreakdown(days = 30): Promise<ActivityBreakdown> {
  const r = await advancedSearch({ incorporatedFrom: isoDaysAgo(Math.min(days, 30)), incorporatedTo: isoDaysAgo(0), status: ["active"], size: 100 });
  const regionCounts = new Map<string, number>();
  const sicCounts = new Map<string, number>();
  const sicLabels: Record<string, string> = {};
  for (const c of r.results) {
    if (c.region && c.region !== "Unknown") regionCounts.set(c.region, (regionCounts.get(c.region) || 0) + 1);
    const s = c.sicCodes[0];
    if (s) {
      sicCounts.set(s, (sicCounts.get(s) || 0) + 1);
      if (!sicLabels[s]) sicLabels[s] = classifySic(s).category;
    }
  }
  return {
    regions: topCounts([...regionCounts.entries()]),
    sics: topCounts([...sicCounts.entries()], sicLabels),
    sampleSize: r.results.length,
    days,
  };
}

export interface QuickInsights {
  fastestSector: { name: string; growth: number };
  fastestRegion: { name: string; index: number };
  topRegion: CountItem | null;
  topSic: CountItem | null;
}

/** Headline insight cards for the dashboard. */
export async function getQuickInsights(days = 30): Promise<QuickInsights> {
  const sec = fastestGrowingSectors(1)[0];
  const reg = regionBreakdown()[0];
  const breakdown = await getActivityBreakdown(days);
  return {
    fastestSector: { name: sec.sector, growth: sec.growth },
    fastestRegion: { name: reg.region, index: reg.growthIndex },
    topRegion: breakdown.regions[0] ?? null,
    topSic: breakdown.sics[0] ?? null,
  };
}
