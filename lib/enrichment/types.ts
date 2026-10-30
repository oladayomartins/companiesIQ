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
