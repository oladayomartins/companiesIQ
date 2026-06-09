// ============================================================
// Google Places (New) — digital-presence enrichment probe
// ------------------------------------------------------------
// Looks up a business by name + locality and returns measured,
// citable facts: Google Business Profile presence, review count,
// rating, website. Server-only — the key never reaches the browser.
//
// Evidence-first: a result is only trusted when the matched place
// name is genuinely similar to the company name. Registered office
// ≠ trading premises, and a text search will otherwise match whatever
// business sits at that address. Weak matches → "Not Assessed" (null),
// never a false positive. Part of the Phase-2 enrichment layer
// (see docs/enrichment.md), fenced from the CH/ONS/Nomis layer.
// ============================================================
import "server-only";
import type { MatchConfidence } from "./types";

export type { MatchConfidence };

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

// Only request the fields we use — Places (New) bills by field-mask tier.
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.nationalPhoneNumber",
].join(",");

// Minimum name-similarity to trust a match (0..1). Below this → Not Assessed.
const MATCH_THRESHOLD = 0.6;

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  nationalPhoneNumber?: string;
}

export interface PlaceMatch {
  placeId: string;
  name: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  website?: string;
  phone?: string;
  mapsUrl?: string;
  businessStatus?: string;
  matchScore: number; // 0..1 similarity to the company name
}

export interface PlacesLookup {
  query: string;
  matchName: string; // the company name we scored against
  confidence: MatchConfidence;
  found: boolean; // a high-confidence match was found
  best: PlaceMatch | null; // top candidate by score (shown even when low-confidence, for transparency)
  candidates: PlaceMatch[];
  // Enrichment signals — only populated on a high-confidence match; null = Not Assessed.
  gbpPresent: boolean | null;
  reviewCount: number | null;
  reviewRating: number | null;
  website: string | null;
  phone: string | null;
  source: string | null; // Google Maps URL of the trusted match (the citation)
  checkedAt: string;
}

// ---- Name matching --------------------------------------------------------

// Conservative suffix strip — only legal-form noise, not distinguishing words.
const SUFFIX = /\b(ltd|limited|plc|llp|llc|inc|co|company|the)\b/g;

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(SUFFIX, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(s: string): Set<string> {
  return new Set(normalizeName(s).split(" ").filter((t) => t.length > 1));
}

/** Similarity 0..1 between a company name and a place name (Dice on tokens, with a containment floor). */
function nameScore(company: string, place: string): number {
  const a = tokenSet(company);
  const b = tokenSet(place);
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const dice = (2 * inter) / (a.size + b.size);
  // Containment floor: one normalized name fully contains the other.
  const na = normalizeName(company);
  const nb = normalizeName(place);
  const contained = na.length > 2 && nb.length > 2 && (na.includes(nb) || nb.includes(na));
  return Math.max(dice, contained ? 0.85 : 0);
}

function mapPlace(p: RawPlace, company: string): PlaceMatch {
  const name = p.displayName?.text ?? "";
  return {
    placeId: p.id ?? "",
    name,
    address: p.formattedAddress,
    rating: p.rating,
    reviewCount: p.userRatingCount,
    website: p.websiteUri,
    phone: p.nationalPhoneNumber,
    mapsUrl: p.googleMapsUri,
    businessStatus: p.businessStatus,
    matchScore: Number(nameScore(company, name).toFixed(2)),
  };
}

// ---- Lookup ---------------------------------------------------------------

/**
 * Text-search Google Places for a UK business, then gate on name similarity.
 * Returns the candidates (with scores) plus a reduced, trust-gated enrichment
 * shape. Throws if the key is missing or the API errors.
 */
export async function lookupPlace(input: { name: string; locality?: string; postcode?: string }): Promise<PlacesLookup> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY is not set");

  const query = [input.name, input.locality, input.postcode, "UK"].filter(Boolean).join(" ");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 5, regionCode: "GB", languageCode: "en" }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as { places?: RawPlace[] };
  const candidates = (data.places ?? [])
    .map((p) => mapPlace(p, input.name))
    .sort((a, b) => b.matchScore - a.matchScore);
  const best = candidates[0] ?? null;

  const confidence: MatchConfidence = !best ? "none" : best.matchScore >= MATCH_THRESHOLD ? "high" : "low";
  const trusted = confidence === "high" ? best : null;

  return {
    query,
    matchName: input.name,
    confidence,
    found: confidence === "high",
    best,
    candidates,
    gbpPresent: confidence === "none" ? false : confidence === "high" ? true : null,
    reviewCount: trusted?.reviewCount ?? null,
    reviewRating: trusted?.rating ?? null,
    website: trusted?.website ?? null,
    phone: trusted?.phone ?? null,
    source: trusted?.mapsUrl ?? null,
    checkedAt: new Date().toISOString(),
  };
}
