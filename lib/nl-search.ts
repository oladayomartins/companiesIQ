// ============================================================
// Natural-language search parser
// ------------------------------------------------------------
// Turns "AI companies in London" into structured filters
// { keywords, sector, region, status, name }.
//
// Default: a deterministic rule-based parser (no API key needed)
// that matches against the keyword dictionary, ONS regions, SIC
// sectors and status vocabulary.
//
// Optional: when ANTHROPIC_API_KEY is set, a small Claude Haiku
// call extracts the same structure for fuzzier phrasing. It always
// falls back to the rule-based result on any error, so the feature
// degrades gracefully.
// ============================================================
import "server-only";
import { KEYWORDS } from "./keywords";
import { ALL_SECTORS } from "./sic";
import { ALL_REGIONS } from "./geography";

export interface ParsedQuery {
  keywords: string[];
  sector?: string;
  region?: string;
  status: string[];
  name?: string; // residual free-text (company-name fragment)
  source: "rules" | "llm";
}

const STATUS_WORDS: Record<string, string> = {
  active: "active",
  dormant: "dormant",
  dissolved: "dissolved",
  liquidation: "liquidation",
  "in liquidation": "liquidation",
  insolvent: "liquidation",
};

const KEYWORD_KEYS = KEYWORDS.map((k) => k.key);

export function parseRuleBased(q: string): ParsedQuery {
  const hay = ` ${q.toLowerCase()} `;
  const keywords = KEYWORD_KEYS.filter((k) => new RegExp(`\\b${k.toLowerCase()}\\b`).test(hay));
  const region = ALL_REGIONS.find((r) => hay.includes(r.toLowerCase()));
  const sector = ALL_SECTORS.find((s) => hay.includes(s.toLowerCase().replace(/&/g, "and")) || hay.includes(s.toLowerCase()));
  const status = Object.keys(STATUS_WORDS)
    .filter((w) => hay.includes(w))
    .map((w) => STATUS_WORDS[w]);

  // residual name = query minus the matched tokens and stopwords
  let name = q;
  const strip = [
    ...keywords,
    ...(region ? [region] : []),
    ...(sector ? [sector] : []),
    ...Object.keys(STATUS_WORDS),
    "companies",
    "company",
    "in",
    "near",
    "with",
    "new",
    "startups?",
    "businesses?",
  ];
  for (const tok of strip) {
    name = name.replace(new RegExp(`\\b${tok}\\b`, "ig"), " ");
  }
  name = name.replace(/\s+/g, " ").trim();

  return { keywords, region, sector, status: Array.from(new Set(status)), name: name || undefined, source: "rules" };
}

const SCHEMA = {
  type: "object",
  properties: {
    keywords: { type: "array", items: { type: "string", enum: KEYWORD_KEYS } },
    sector: { type: "string", enum: ["", ...ALL_SECTORS] },
    region: { type: "string", enum: ["", ...ALL_REGIONS] },
    status: { type: "array", items: { type: "string", enum: ["active", "dormant", "dissolved", "liquidation"] } },
    name: { type: "string" },
  },
  required: ["keywords", "sector", "region", "status", "name"],
  additionalProperties: false,
} as const;

export async function parseQuery(q: string): Promise<ParsedQuery> {
  const fallback = parseRuleBased(q);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !q.trim()) return fallback;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 400,
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
        system:
          "You convert a UK company-search phrase into structured filters. Use only the allowed enum values. " +
          "Map themes to keywords, a registered-office region, a SIC sector, company statuses, and any residual company-name text. " +
          "Leave a field empty/[] if not present. Do not invent values.",
        messages: [{ role: "user", content: q }],
      }),
      // small, fast — don't cache (queries vary)
      cache: "no-store",
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((b) => b.type === "text")?.text;
    if (!text) return fallback;
    const parsed = JSON.parse(text) as Partial<ParsedQuery>;
    return {
      keywords: (parsed.keywords || []).filter((k) => KEYWORD_KEYS.includes(k)),
      sector: parsed.sector || undefined,
      region: parsed.region || undefined,
      status: parsed.status || [],
      name: parsed.name || undefined,
      source: "llm",
    };
  } catch {
    return fallback;
  }
}
