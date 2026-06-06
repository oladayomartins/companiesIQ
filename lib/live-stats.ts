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
  new30d: number;
  dissolved30d: number;
  newToday: number;
}

export async function getRegisterKpis(): Promise<RegisterKpis> {
  const [active, new30d, dissolved30d, newToday] = await Promise.all([
    countCompanies({ status: ["active"] }),
    countCompanies({ incorporatedFrom: isoDaysAgo(30), incorporatedTo: isoDaysAgo(0) }),
    countCompanies({ dissolvedFrom: isoDaysAgo(30), dissolvedTo: isoDaysAgo(0) }),
    countCompanies({ incorporatedFrom: isoDaysAgo(1), incorporatedTo: isoDaysAgo(0) }),
  ]);
  return { active, new30d, dissolved30d, newToday };
}

/** Recently incorporated companies (live), enriched + scored. */
export async function getRecentIncorporations(size = 8): Promise<EnrichedResult[]> {
  const r = await explore({ incorporatedFrom: isoDaysAgo(10), incorporatedTo: isoDaysAgo(0), status: ["active"], size });
  return r.results.slice(0, size);
}

/** Recently dissolved companies (live). */
export async function getRecentDissolutions(size = 6): Promise<EnrichedResult[]> {
  const r = await explore({ dissolvedFrom: isoDaysAgo(14), dissolvedTo: isoDaysAgo(0), status: ["dissolved"], size });
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
