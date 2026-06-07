// ============================================================
// Competitor digital-presence aggregates (the funnel's hook)
// ------------------------------------------------------------
// Enriches the similar-company sample (cache-first) and computes the
// "what competitors are doing" percentages over the companies actually
// MEASURED with a confident match. Always reports the sample size + date
// so the figure is evidence-based, never extrapolated or invented.
// See docs/enrichment.md. Server-only.
// ============================================================
import "server-only";
import { enrichCompany } from "./index";

export interface CompetitorExample {
  name: string;
  website: boolean;
  gbp: boolean;
  reviewCount: number | null;
  reviewRating: number | null;
}

export interface CompetitorPresence {
  total: number; // companies attempted
  sampleSize: number; // companies measured with a confident match
  pctWebsite: number | null;
  pctGbp: number | null;
  pctReviews: number | null;
  avgRating: number | null;
  avgSignals: number | null; // mean of 0..3 (website/GBP/reviews) across measured competitors
  examples: CompetitorExample[]; // most-visible measured competitors
  measuredAt: string;
}

export async function getCompetitorPresence(
  companies: { number: string; name: string; region?: string }[]
): Promise<CompetitorPresence> {
  const results = await Promise.all(
    companies.map((c) => enrichCompany({ number: c.number, name: c.name, locality: c.region }).catch(() => null))
  );
  const measured = results.filter((r) => r && r.matchConfidence === "high");
  const n = measured.length;

  let website = 0,
    gbp = 0,
    reviews = 0,
    ratingSum = 0,
    ratingN = 0,
    signalsSum = 0;
  const rows: (CompetitorExample & { signals: number })[] = [];
  for (const r of measured) {
    if (!r) continue;
    const hasWeb = !!r.websiteUrl;
    const hasGbp = r.gbpPresent === true;
    const hasRev = (r.reviewCount ?? 0) > 0;
    if (hasWeb) website++;
    if (hasGbp) gbp++;
    if (hasRev) reviews++;
    if (r.reviewRating != null) {
      ratingSum += r.reviewRating;
      ratingN++;
    }
    const signals = (hasWeb ? 1 : 0) + (hasGbp ? 1 : 0) + (hasRev ? 1 : 0);
    signalsSum += signals;
    rows.push({ name: r.companyName || "A local business", website: hasWeb, gbp: hasGbp, reviewCount: r.reviewCount, reviewRating: r.reviewRating, signals });
  }
  const pct = (x: number) => (n ? Math.round((x / n) * 100) : null);

  const examples = rows
    .sort((a, b) => b.signals - a.signals || (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
    .slice(0, 3)
    .map(({ name, website, gbp, reviewCount, reviewRating }) => ({ name, website, gbp, reviewCount, reviewRating }));

  return {
    total: companies.length,
    sampleSize: n,
    pctWebsite: pct(website),
    pctGbp: pct(gbp),
    pctReviews: pct(reviews),
    avgRating: ratingN ? Number((ratingSum / ratingN).toFixed(1)) : null,
    avgSignals: n ? Number((signalsSum / n).toFixed(1)) : null,
    examples,
    measuredAt: new Date().toISOString(),
  };
}
