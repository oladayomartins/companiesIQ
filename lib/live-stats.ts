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
import { keywordsForResult, aggregateKeywords } from "./keywords";

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
  cities: CountItem[];
  sics: CountItem[];
  sampleSize: number;
  days: number;
}

/** Most active regions, towns/cities + most-registered SIC codes among recent incorporations. */
export async function getActivityBreakdown(days = 30): Promise<ActivityBreakdown> {
  const r = await advancedSearch({ incorporatedFrom: isoDaysAgo(Math.min(days, 30)), incorporatedTo: isoDaysAgo(0), status: ["active"], size: 100 });
  const regionCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();
  const sicCounts = new Map<string, number>();
  const sicLabels: Record<string, string> = {};
  for (const c of r.results) {
    if (c.region && c.region !== "Unknown") regionCounts.set(c.region, (regionCounts.get(c.region) || 0) + 1);
    if (c.locality) {
      const city = titleCity(c.locality);
      cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
    }
    const s = c.sicCodes[0];
    if (s) {
      sicCounts.set(s, (sicCounts.get(s) || 0) + 1);
      if (!sicLabels[s]) sicLabels[s] = classifySic(s).category;
    }
  }
  return {
    regions: topCounts([...regionCounts.entries()]),
    cities: topCounts([...cityCounts.entries()]),
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

// ===============================================================
// Opportunity radar
// ---------------------------------------------------------------
// One live sample of recently incorporated companies, reduced into
// the buckets the dashboard surfaces as "opportunity pockets":
// activities (SIC), industries, regions, cities, legal types, and
// commercial keyword signals. The same sample feeds the explorable
// company table, so every tile a user clicks maps to real rows.
// ===============================================================

const RADAR_SAMPLE = 200;

const COMPANY_TYPE_LABELS: Record<string, string> = {
  ltd: "Private limited",
  plc: "Public limited (PLC)",
  llp: "Limited liability partnership",
  "private-unlimited": "Private unlimited",
  "old-public-company": "Old public company",
  "private-limited-guarant-nsc": "Company limited by guarantee",
  "private-limited-guarant-nsc-limited-exemption": "Company limited by guarantee",
  "limited-partnership": "Limited partnership",
  "private-limited-shares-section-30-exemption": "Private limited (s.30)",
  "community-interest-company": "Community interest company",
  "scottish-partnership": "Scottish partnership",
  "charitable-incorporated-organisation": "Charitable incorporated org",
};

function typeLabel(t: string): string {
  return COMPANY_TYPE_LABELS[t] ?? t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Title-case a registered-office town, e.g. "LONDON" → "London". */
function titleCity(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\b(Of|The|And|Upon|On)\b/g, (m) => m.toLowerCase());
}

export interface RadarBucket {
  key: string;
  label: string;
  sub?: string;
  count: number;
  share: number; // 0..1 of the leading bucket
}

export interface RadarCompany {
  number: string;
  name: string;
  status: string;
  incorporated?: string;
  sicCodes: string[];
  region: string;
  locality?: string;
  postcode?: string;
  sector?: string;
  companyType?: string;
  keywords: string[];
}

export interface RadarData {
  totalActive: number;
  newInWindow: number;
  days: number;
  sampleSize: number;
  topCity: RadarBucket | null;
  topActivity: RadarBucket | null;
  activities: RadarBucket[];
  industries: RadarBucket[];
  regions: RadarBucket[];
  cities: RadarBucket[];
  companyTypes: RadarBucket[];
  keywords: { key: string; count: number; share: number }[];
  companies: RadarCompany[];
}

function toBuckets(counts: Map<string, number>, label: (k: string) => string, sub: (k: string) => string | undefined, n: number): RadarBucket[] {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  const max = sorted[0]?.[1] ?? 1;
  return sorted.map(([key, count]) => ({ key, label: label(key), sub: sub(key), count, share: count / max }));
}

/**
 * Full opportunity-radar payload for the dashboard, from a single live
 * sample of recent incorporations plus the register-wide active count.
 */
export async function getRadarData(days = 30): Promise<RadarData> {
  const from = isoDaysAgo(Math.min(days, 365));
  const to = isoDaysAgo(0);
  const [totalActive, sample] = await Promise.all([
    countCompanies({ status: ["active"] }),
    advancedSearch({ incorporatedFrom: from, incorporatedTo: to, status: ["active"], size: RADAR_SAMPLE }),
  ]);
  const results = sample.results;

  const sicC = new Map<string, number>();
  const sectorC = new Map<string, number>();
  const regionC = new Map<string, number>();
  const cityC = new Map<string, number>();
  const typeC = new Map<string, number>();
  const kwItems: { keywords: string[] }[] = [];
  const companies: RadarCompany[] = [];

  for (const c of results) {
    const primary = c.sicCodes[0];
    if (primary) sicC.set(primary, (sicC.get(primary) || 0) + 1);
    const sector = c.classification?.sector;
    if (sector) sectorC.set(sector, (sectorC.get(sector) || 0) + 1);
    if (c.region && c.region !== "Unknown") regionC.set(c.region, (regionC.get(c.region) || 0) + 1);
    const city = c.locality ? titleCity(c.locality) : null;
    if (city) cityC.set(city, (cityC.get(city) || 0) + 1);
    if (c.companyType) typeC.set(c.companyType, (typeC.get(c.companyType) || 0) + 1);

    const keywords = keywordsForResult(c);
    kwItems.push({ keywords });
    companies.push({
      number: c.number,
      name: c.name,
      status: c.status,
      incorporated: c.incorporated,
      sicCodes: c.sicCodes,
      region: c.region ?? "Unknown",
      locality: city ?? undefined,
      postcode: c.postcode,
      sector: sector ?? undefined,
      companyType: c.companyType,
      keywords,
    });
  }

  const activities = toBuckets(sicC, (k) => classifySic(k).description, (k) => classifySic(k).sector, 8);
  const industries = toBuckets(sectorC, (k) => k, () => undefined, 6);
  const regions = toBuckets(regionC, (k) => k, () => undefined, 6);
  const cities = toBuckets(cityC, (k) => k, () => undefined, 6);
  const companyTypes = toBuckets(typeC, (k) => typeLabel(k), () => undefined, 5);
  const keywords = aggregateKeywords(kwItems)
    .slice(0, 6)
    .map((k) => ({ key: k.key, count: k.count, share: k.share }));

  const topCity = cities[0]
    ? { ...cities[0], key: cities[0].key }
    : null;
  const topActivity = sicC.size
    ? { key: activities[0].key, label: activities[0].key, sub: classifySic(activities[0].key).description, count: activities[0].count, share: 1 }
    : null;

  return {
    totalActive,
    newInWindow: sample.total,
    days,
    sampleSize: results.length,
    topCity,
    topActivity,
    activities,
    industries,
    regions,
    cities,
    companyTypes,
    keywords,
    companies,
  };
}
