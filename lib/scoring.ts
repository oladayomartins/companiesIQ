// ============================================================
// Opportunity scoring engine
// ------------------------------------------------------------
//   Opportunity Score (0–100)
//     = Industry demand   (sector size + survival)      · 30
//     + Growth rate       (sector annual growth)        · 30
//     + Location demand   (regional growth index)       · 20
//     + Keyword signals   (commercial theme strength)   · 20
//
// A transparent, weighted blend of evidence-first signals — no
// black-box model. Returns the score plus its components so the UI
// can always show the working. This powers the (Pro) lead lens.
// ============================================================
import type { Company, SearchResult } from "./types";
import { sectorStat } from "./ons";
import { REGION_STATS } from "./ons";
import { keywordsForCompany, keywordsForResult, keywordWeight } from "./keywords";

export interface ScoreBreakdown {
  total: number; // 0..100
  industryDemand: number; // 0..30
  growth: number; // 0..30
  locationDemand: number; // 0..20
  keywordSignals: number; // 0..20
  keywords: string[];
  band: "Cold" | "Warm" | "Hot" | "Prime";
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function band(total: number): ScoreBreakdown["band"] {
  if (total >= 80) return "Prime";
  if (total >= 60) return "Hot";
  if (total >= 40) return "Warm";
  return "Cold";
}

function score(sector: string | undefined, region: string | undefined, keywords: string[]): ScoreBreakdown {
  const stat = sectorStat(sector);

  // Industry demand: size (log-scaled vs ~1.2M max) blended with 5-yr survival.
  const sizeScore = clamp(Math.log10(stat.businesses + 1) / Math.log10(1_300_000), 0, 1);
  const survivalScore = clamp(stat.survival.fiveYear / 60, 0, 1);
  const industryDemand = +((sizeScore * 0.6 + survivalScore * 0.4) * 30).toFixed(1);

  // Growth: 0% → 0, 15%+ → full.
  const growth = +(clamp(stat.annualGrowth / 15, 0, 1) * 30).toFixed(1);

  // Location demand: regional growth index (≈0.88..1.34) normalised.
  const idx = region ? REGION_STATS[region]?.growthIndex ?? 1 : 1;
  const locationDemand = +(clamp((idx - 0.85) / (1.35 - 0.85), 0, 1) * 20).toFixed(1);

  // Keyword signals: strongest matched theme drives most of it, with a
  // small bonus for breadth.
  const top = keywords.reduce((m, k) => Math.max(m, keywordWeight(k)), 0);
  const breadth = clamp(keywords.length / 4, 0, 1);
  const keywordSignals = +(clamp(top * 0.8 + breadth * 0.2, 0, 1) * 20).toFixed(1);

  const total = Math.round(industryDemand + growth + locationDemand + keywordSignals);
  return { total, industryDemand, growth, locationDemand, keywordSignals, keywords, band: band(total) };
}

export function scoreCompany(c: Company): ScoreBreakdown {
  return score(c.primaryClassification?.sector, c.geo?.region, keywordsForCompany(c));
}

export function scoreResult(r: SearchResult & { keywords?: string[] }): ScoreBreakdown {
  return score(r.classification?.sector, r.region, r.keywords ?? keywordsForResult(r));
}
