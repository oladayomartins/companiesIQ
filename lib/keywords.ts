// ============================================================
// Keyword intelligence engine
// ------------------------------------------------------------
// Extracts commercial signal keywords from a company's name, SIC
// classifications and (where available) filing descriptions, then
// aggregates frequency across a result set to surface trending
// themes ("Google Trends for UK business formation").
//
// Evidence-first: keywords are matched from a curated dictionary of
// real industry themes — no invented signals. Each keyword carries a
// weight used by the opportunity-scoring engine.
// ============================================================
import type { Company, SearchResult, Filing } from "./types";

export interface KeywordDef {
  key: string; // canonical label
  weight: number; // 0..1 commercial-signal strength
  patterns: RegExp; // case-insensitive match against text
}

// Curated theme dictionary. Patterns match whole-ish words to avoid
// false hits (e.g. "ai" must not match "claim").
const D = (key: string, weight: number, words: string[]): KeywordDef => ({
  key,
  weight,
  patterns: new RegExp(`\\b(${words.join("|")})\\b`, "i"),
});

export const KEYWORDS: KeywordDef[] = [
  D("AI", 0.95, ["ai", "artificial intelligence", "machine learning", "ml", "neural", "genai", "llm"]),
  D("Fintech", 0.9, ["fintech", "payments?", "bank(s|ing)?", "wallet", "lending", "neobank", "financ(e|ial)", "auxiliary financial"]),
  D("Crypto", 0.8, ["crypto", "blockchain", "web3", "defi", "token", "nft"]),
  D("SaaS", 0.85, ["saas", "software", "platform", "cloud", "computer programming", "information technology"]),
  D("Cybersecurity", 0.85, ["cyber", "security", "infosec", "threat"]),
  D("Healthcare", 0.8, ["health", "healthcare", "medical", "clinic", "pharma", "biotech", "dental"]),
  D("Care", 0.75, ["care", "caring", "carers?", "homecare", "domiciliary", "nursing"]),
  D("Recruitment", 0.7, ["recruit(ment|ing)?", "staffing", "talent", "headhunt"]),
  D("Property", 0.7, ["property", "properties", "estate", "lettings?", "real estate", "homes?"]),
  D("Construction", 0.65, ["construction", "builders?", "building", "groundworks?", "scaffolding", "joinery"]),
  D("Solar", 0.8, ["solar", "renewable", "photovoltaic", "pv"]),
  D("Cleantech", 0.8, ["cleantech", "green", "carbon", "sustainab(le|ility)", "ev", "battery"]),
  D("Energy", 0.7, ["energy", "power", "electric", "heat pump"]),
  D("Ecommerce", 0.7, ["ecommerce", "e-commerce", "online (retail|store|shop)", "dropship", "marketplace"]),
  D("Logistics", 0.6, ["logistics", "courier", "delivery", "freight", "haulage", "fulfil(l)?ment"]),
  D("Marketing", 0.6, ["marketing", "agency", "media", "advertis(e|ing)", "seo", "brand"]),
  D("Consulting", 0.55, ["consult(ing|ancy|ants?)", "advisory"]),
  D("Hospitality", 0.5, ["restaurant", "cafe", "catering", "hospitality", "bar", "kitchen"]),
  D("Automotive", 0.55, ["automotive", "motors?", "vehicles?", "garage", "ev charging"]),
  D("Education", 0.55, ["education", "training", "academy", "tutoring", "learning", "edtech"]),
  D("Beauty", 0.5, ["beauty", "aesthetics?", "salon", "cosmetics?", "barber"]),
  D("Legal", 0.55, ["legal", "solicitors?", "law", "conveyancing"]),
];

/** Extract distinct keyword keys from a single company's text. */
export function extractKeywords(input: { name?: string; sicText?: string[]; filings?: Filing[] }): string[] {
  const hay = [input.name || "", ...(input.sicText || []), ...(input.filings || []).map((f) => f.label)]
    .join(" ")
    .toLowerCase();
  const hits: string[] = [];
  for (const k of KEYWORDS) {
    if (k.patterns.test(hay)) hits.push(k.key);
  }
  return hits;
}

export function keywordsForCompany(c: Company): string[] {
  return extractKeywords({ name: c.name, sicText: c.classifications.map((cl) => `${cl.category} ${cl.division} ${cl.sector}`) });
}

export function keywordsForResult(r: SearchResult): string[] {
  return extractKeywords({ name: r.name, sicText: r.classification ? [`${r.classification.category} ${r.classification.sector}`] : [] });
}

export function keywordWeight(key: string): number {
  return KEYWORDS.find((k) => k.key === key)?.weight ?? 0.4;
}

export interface KeywordSignal {
  key: string;
  count: number;
  share: number; // 0..1 of max
  weight: number;
}

/** Aggregate keyword frequency across a set of companies/results. */
export function aggregateKeywords(items: { keywords?: string[] }[]): KeywordSignal[] {
  const counts = new Map<string, number>();
  for (const it of items) {
    for (const k of it.keywords || []) counts.set(k, (counts.get(k) || 0) + 1);
  }
  const arr = [...counts.entries()].map(([key, count]) => ({ key, count, weight: keywordWeight(key) }));
  arr.sort((a, b) => b.count - a.count || b.weight - a.weight);
  const max = arr[0]?.count || 1;
  return arr.map((a) => ({ ...a, share: a.count / max }));
}
