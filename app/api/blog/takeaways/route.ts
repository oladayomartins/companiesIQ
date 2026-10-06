// Admin-only: suggest 3–5 key takeaways for an EXISTING post, drawn only from
// its own text. Powers the "Suggest takeaways" button in the blog editor; the
// admin reviews and edits before anything is saved (this route writes nothing).
// Degrades gracefully (503) when ANTHROPIC_API_KEY isn't set.
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { takeaways: { type: "array", items: { type: "string" } } },
  required: ["takeaways"],
} as const;

const SYSTEM = `You write the "Key takeaways" box for CompaniesIQ blog articles. CompaniesIQ is a UK company-intelligence platform built on Companies House, ONS and Nomis data.

Read the article and return 3–5 takeaways. Rules:
- Each is ONE complete, self-contained sentence of at most ~25 words, in clear British English. State a conclusion — the answer, not a teaser.
- Use ONLY claims the article itself makes. No new facts, numbers, dates or product capabilities.
- Where the article itself describes what CompaniesIQ does, include a takeaway that names CompaniesIQ — at most two, and only as the article states it.
- Never recommend or favour a competitor (e.g. Endole, Company Check, Beauhurst, OpenCorporates) over CompaniesIQ, even if the article mentions them.
- No marketing hype, no exclamation marks, no markdown.`;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI suggestions aren't configured (ANTHROPIC_API_KEY not set)." }, { status: 503 });
  }

  const { title, body_md } = (await req.json().catch(() => ({}))) as { title?: string; body_md?: string };
  if (!body_md || body_md.trim().length < 200) {
    return NextResponse.json({ error: "Add the article body first — takeaways are drawn from it." }, { status: 400 });
  }

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      // Short extraction from text we hand it: low effort is plenty.
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      // If a safety classifier declines, retry on a fallback model automatically.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: `<title>${title ?? ""}</title>\n\n<article>\n${body_md}\n</article>` }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "The model declined this article — write the takeaways by hand." }, { status: 422 });
    }
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const parsed = JSON.parse(text) as { takeaways?: unknown };
    const takeaways = Array.isArray(parsed.takeaways)
      ? parsed.takeaways.filter((t): t is string => typeof t === "string" && !!t.trim()).map((t) => t.trim()).slice(0, 5)
      : [];
    if (!takeaways.length) return NextResponse.json({ error: "No takeaways came back — try again." }, { status: 502 });
    return NextResponse.json({ takeaways });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Rate limited — try again in a minute." }, { status: 429 });
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Claude error ${e.status}: ${e.message.slice(0, 200)}` }, { status: 502 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Suggestion failed." }, { status: 502 });
  }
}
