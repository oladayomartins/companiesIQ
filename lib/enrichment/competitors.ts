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

export interface CompetitorPresence {
  total: number; // companies attempted
  sampleSize: number; // companies measured with a confident match
  pctWebsite: number | null;
  pctGbp: number | null;
  pctReviews: number | null;
  avgRating: number | null;
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
    ratingN = 0;
  for (const r of measured) {
    if (!r) continue;
    if (r.websiteUrl) website++;
    if (r.gbpPresent) gbp++;
    if ((r.reviewCount ?? 0) > 0) reviews++;
    if (r.reviewRating != null) {
      ratingSum += r.reviewRating;
      ratingN++;
    }
  }
  const pct = (x: number) => (n ? Math.round((x / n) * 100) : null);

  return {
    total: companies.length,
    sampleSize: n,
    pctWebsite: pct(website),
    pctGbp: pct(gbp),
    pctReviews: pct(reviews),
    avgRating: ratingN ? Number((ratingSum / ratingN).toFixed(1)) : null,
    measuredAt: new Date().toISOString(),
  };
}
