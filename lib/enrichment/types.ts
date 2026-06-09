// Client-safe enrichment types + pure helpers. NO server-only deps, so these
// can be imported by client components (the report UI). Runtime enrichment
// (Places, Supabase) lives in the server-only ./index and ./places modules.

export type MatchConfidence = "high" | "low" | "none";

export interface CompanyEnrichment {
  companyNumber: string;
  companyName?: string;
  gbpPresent: boolean | null; // null = not assessed
  reviewCount: number | null;
  reviewRating: number | null;
  websiteUrl: string | null;
  phone: string | null;
  matchConfidence: MatchConfidence | null;
  matchScore: number | null;
  placesSource: string | null;
  aiVisible: boolean | null; // null until/if an AI-visibility measurement runs
  checkedAt: string;
  cached: boolean;
}

export type ReadinessLevel = "high" | "moderate" | "low" | "unknown";

/**
 * Zero-cost AI-visibility *readiness* derived from verified presence signals
 * (website + GBP + reviews). This is a readiness proxy, NOT measured AI
 * placement — we never claim a company "appears in AI results" from a heuristic.
 * Returns "unknown" when nothing has been measured.
 */
export function aiReadiness(e: CompanyEnrichment | null): { level: ReadinessLevel; score: number } {
  if (!e || (e.gbpPresent == null && !e.websiteUrl)) return { level: "unknown", score: 0 };
  const score = (e.websiteUrl ? 1 : 0) + (e.gbpPresent === true ? 1 : 0) + ((e.reviewCount ?? 0) > 0 ? 1 : 0);
  return { level: score >= 3 ? "high" : score === 2 ? "moderate" : "low", score };
}
