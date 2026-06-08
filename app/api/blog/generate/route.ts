// Admin-only: draft an SEO/AEO-optimised blog post with Claude.
// Matches the app's existing raw-fetch Claude pattern (lib/nl-search.ts).
// Model claude-opus-4-8 with adaptive thinking + structured JSON output.
// Degrades gracefully (503) when ANTHROPIC_API_KEY isn't set.
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// JSON schema the model must return — guarantees a parseable, complete draft.
const POST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    slug: { type: "string" },
    excerpt: { type: "string" },
    meta_description: { type: "string" },
    body_md: { type: "string" },
    faq: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { q: { type: "string" }, a: { type: "string" } },
        required: ["q", "a"],
      },
    },
    related: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { label: { type: "string" }, href: { type: "string" } },
        required: ["label", "href"],
      },
    },
  },
  required: ["title", "slug", "excerpt", "meta_description", "body_md", "faq", "related"],
} as const;

const SYSTEM = `You are the content lead for CompaniesIQ, a UK business-intelligence platform built on public data (Companies House, ONS, Nomis). You write factual, genuinely useful articles for founders, analysts and operators — never fluff or fabricated statistics.

Write a single blog post following SEO, GEO and AEO best practices:
- A clear, specific, search-friendly title (front-load the primary keyword).
- A kebab-case slug (lowercase, hyphens, no stop-word noise).
- meta_description: compelling, <= 155 characters.
- excerpt: 1–2 sentence summary.
- body_md: well-structured Markdown. Open with a direct, answer-first paragraph (AEO). Use ## H2 and ### H3 section headings, short paragraphs, and bullet lists where useful. Target ~1,000–1,500 words. Be concrete and accurate; do NOT invent company-specific numbers or cite statistics you cannot ground in Companies House / ONS / Nomis. Where you reference data, attribute it to those sources.
- INTERNAL LINKS: weave 3–6 relevant internal links into body_md using Markdown links to real CompaniesIQ pages. Valid link targets:
  - /industry/<sector-slug> (e.g. /industry/technology, /industry/construction)
  - /market/<region-slug> (e.g. /market/london, /market/scotland)
  - /city/<city-slug> (e.g. /city/manchester, /city/birmingham)
  - /signals/<theme-slug> (e.g. /signals/ai, /signals/fintech)
  - /pricing, /sources, /company/<number> (only if a real company number is provided in the brief)
- faq: 3–5 question/answer pairs that real users would ask (powers FAQ schema + AEO). Answers concise and self-contained.
- related: 3–5 {label, href} internal links (same valid targets as above) for the related section.

Return ONLY the structured object. Tone: clear, direct, expert, no hype.`;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "AI drafting isn't configured (ANTHROPIC_API_KEY not set)." }, { status: 503 });

  const { topic, notes } = (await req.json().catch(() => ({}))) as { topic?: string; notes?: string };
  if (!topic || !topic.trim()) return NextResponse.json({ error: "A topic is required." }, { status: 400 });

  const userPrompt = `Topic / brief: ${topic.trim()}${notes ? `\n\nAdditional notes: ${notes.trim()}` : ""}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 8000,
        thinking: { type: "adaptive" },
        system: SYSTEM,
        messages: [{ role: "user", content: userPrompt }],
        output_config: { format: { type: "json_schema", schema: POST_SCHEMA } },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json({ error: `Claude error ${res.status}: ${detail.slice(0, 300)}` }, { status: 502 });
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text as string)
      .join("");
    if (!text) return NextResponse.json({ error: "Empty response from Claude." }, { status: 502 });

    const draft = JSON.parse(text);
    return NextResponse.json({ draft });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Generation failed." }, { status: 502 });
  }
}
