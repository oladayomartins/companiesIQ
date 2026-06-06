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
import { aggregateKeywords, keywordsForResult, type KeywordSignal } from "./keywords";

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

/** Trending keyword signals across a live sample of recent incorporations. */
export async function getTrendingSignals(): Promise<KeywordSignal[]> {
  const r = await advancedSearch({ incorporatedFrom: isoDaysAgo(14), incorporatedTo: isoDaysAgo(0), status: ["active"], size: 100 });
  const items = r.results.map((c) => ({ keywords: keywordsForResult(c) }));
  return aggregateKeywords(items).slice(0, 8);
}
