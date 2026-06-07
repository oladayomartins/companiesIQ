// ============================================================
// Enrichment orchestrator + cache
// ------------------------------------------------------------
// enrichCompany() is the single entry point: read the cache, and on a
// miss/stale entry run the live lookups, write the cache, and return.
// Currently Google Places only (GBP, reviews, website); the Claude
// website-discovery + AI-visibility slices plug in here later.
// Degrades gracefully when Supabase isn't configured (no cache, live only).
// See docs/enrichment.md.
// ============================================================
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { lookupPlace } from "./places";
import type { CompanyEnrichment } from "./types";

export type { CompanyEnrichment } from "./types";
export { aiReadiness, type ReadinessLevel, type MatchConfidence } from "./types";

const DEFAULT_TTL_DAYS = 30;

function isFresh(checkedAt: string, ttlDays: number): boolean {
  const age = Date.now() - new Date(checkedAt).getTime();
  return age < ttlDays * 86_400_000;
}

/**
 * Enrich a company's digital presence, cached in public.company_enrichment.
 * Pass `force` to bypass a fresh cache entry and re-measure.
 */
export async function enrichCompany(input: {
  number: string;
  name: string;
  locality?: string;
  postcode?: string;
  force?: boolean;
}): Promise<CompanyEnrichment> {
  const admin = getSupabaseAdmin();

  // 1. Cache read (best-effort — missing table / no Supabase just falls through).
  if (admin && !input.force) {
    const { data } = await admin.from("company_enrichment").select("*").eq("company_number", input.number).maybeSingle();
    if (data && isFresh(data.checked_at, data.ttl_days ?? DEFAULT_TTL_DAYS)) {
      return {
        companyNumber: data.company_number,
        companyName: data.company_name ?? undefined,
        gbpPresent: data.gbp_present,
        reviewCount: data.review_count,
        reviewRating: data.review_rating != null ? Number(data.review_rating) : null,
        websiteUrl: data.website_url,
        matchConfidence: data.match_confidence,
        matchScore: data.match_score != null ? Number(data.match_score) : null,
        placesSource: data.places_source,
        aiVisible: data.ai_visible,
        checkedAt: data.checked_at,
        cached: true,
      };
    }
  }

  // 2. Live measurement (Places now; Claude website/AI-visibility added later).
  const places = await lookupPlace({ name: input.name, locality: input.locality, postcode: input.postcode });

  // 3. Cache write (best-effort — ignored if the table/Supabase isn't there).
  if (admin) {
    await admin.from("company_enrichment").upsert(
      {
        company_number: input.number,
        company_name: input.name,
        gbp_present: places.gbpPresent,
        review_count: places.reviewCount,
        review_rating: places.reviewRating,
        website_url: places.website,
        match_confidence: places.confidence,
        match_score: places.best?.matchScore ?? null,
        places_source: places.source,
        ai_visible: null,
        raw: places as unknown as Record<string, unknown>,
        checked_at: places.checkedAt,
        ttl_days: DEFAULT_TTL_DAYS,
      },
      { onConflict: "company_number" }
    );
  }

  return {
    companyNumber: input.number,
    companyName: input.name,
    gbpPresent: places.gbpPresent,
    reviewCount: places.reviewCount,
    reviewRating: places.reviewRating,
    websiteUrl: places.website,
    matchConfidence: places.confidence,
    matchScore: places.best?.matchScore ?? null,
    placesSource: places.source,
    aiVisible: null,
    checkedAt: places.checkedAt,
    cached: false,
  };
}
