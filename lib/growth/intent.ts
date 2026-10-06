// ============================================================
// On-site search intent (pure, client-safe).
//
// A search for "Monzo" and a search for "new construction companies in
// Birmingham" are different jobs: the first looks a company up, the second is
// the start of a prospect list. This classifies what someone typed into the
// search box so the funnel can tell them apart. It reads the same structured
// reading the search runs on (lib/search-parse readQuery), plus the words.
// ============================================================

export type SearchIntent = "lookup" | "market" | "trigger" | "leadgen";

export const SEARCH_INTENT_LABELS: Record<SearchIntent, string> = {
  lookup: "Company look-up",
  market: "Market / ICP",
  trigger: "New-company trigger",
  leadgen: "Lead generation",
};

/** Commercial value used in the intent score (look-ups are research, not demand). */
export const SEARCH_INTENT_POINTS: Record<SearchIntent, number> = { lookup: 2, market: 10, trigger: 14, leadgen: 14 };

const LEADGEN = /\b(leads?|prospects?|prospecting|to sell to|to target|clients?|customers?|b2b)\b/i;
const TRIGGER = /\b(new|newly|recent(ly)?|latest|just (formed|registered|incorporated)|formed|registered|incorporated|this (week|month)|today|start-?ups?)\b/i;

export interface SearchReadingLike {
  name?: string | null;
  sector?: string | null;
  region?: string | null;
  place?: string | null;
}

export function classifySearch(query: string, reading: SearchReadingLike): SearchIntent {
  const q = query.trim();
  const scoped = !!(reading.sector || reading.region || reading.place);
  if (LEADGEN.test(q)) return "leadgen";
  // A legal suffix means a specific company ("Monzo Bank Limited"), even when a
  // word in it ("bank") also reads as a sector.
  if (/\b(ltd|limited|plc|llp|cic)\b/i.test(q)) return "lookup";
  // A market search names a population: a plural ("tech companies", "agencies")
  // or a place. A sector word alone ("monzo bank") is still a company look-up.
  const plural = /\b(companies|businesses|firms|agencies|startups?|start-ups|practices|contractors|retailers|suppliers|brands)\b/i.test(q);
  if (reading.sector && !reading.place && !reading.region && !plural && !TRIGGER.test(q)) return "lookup";
  if (TRIGGER.test(q) && (scoped || /\bcompan(y|ies)|business(es)?\b/i.test(q))) return "trigger";
  if (scoped) return "market";
  return "lookup";
}
