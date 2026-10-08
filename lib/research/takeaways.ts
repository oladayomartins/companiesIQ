// Research editions use the same article format as every other blog post: a
// "Key takeaways" box under the intro, filled from the post's key_takeaways
// field. A study renders its headline findings as a bullet list ("## Key
// findings", or "## What we found" in the Commercial Opportunity series); this
// lifts those bullets into key_takeaways as plain sentences and removes them
// from the body, so the box carries them and the article doesn't say
// everything twice. Any table or chart in the same section stays.
import type { PostDraft } from "./types";

const FINDINGS_HEADINGS = ["Key findings", "What we found"];
const MAX_TAKEAWAYS = 5;

/** Markdown → the plain sentence the takeaways box renders. */
function plain(line: string): string {
  let s = line
    .replace(/^[ \t]*[-*+][ \t]+/, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|__|`/g, "")
    .replace(/(^|\s)\*([^*]+)\*/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
  if (s && !/[.!?]$/.test(s)) s += ".";
  return s;
}

export function withTakeaways(draft: PostDraft): PostDraft {
  if (draft.key_takeaways?.length) return draft;
  const lines = draft.body_md.split("\n");
  const start = lines.findIndex((l) => FINDINGS_HEADINGS.some((h) => l.trim() === `## ${h}`));
  if (start < 0) return draft;

  // The bullet block: bullets and blank lines straight after the heading, up to
  // the first line of anything else.
  let end = start + 1;
  const bullets: string[] = [];
  while (end < lines.length && (/^[ \t]*[-*+][ \t]+/.test(lines[end]) || !lines[end].trim())) {
    if (lines[end].trim()) bullets.push(plain(lines[end]));
    end++;
  }
  if (!bullets.length) return draft;

  // Drop the heading too when nothing but the bullets lived under it.
  const nextIsSectionOrEnd = end >= lines.length || /^##[ \t]/.test(lines[end]);
  const cutFrom = nextIsSectionOrEnd ? start : start + 1;
  const body = [...lines.slice(0, cutFrom), ...(nextIsSectionOrEnd ? [] : [""]), ...lines.slice(end)].join("\n").replace(/\n{3,}/g, "\n\n");

  return { ...draft, body_md: body, key_takeaways: bullets.filter(Boolean).slice(0, MAX_TAKEAWAYS) };
}
