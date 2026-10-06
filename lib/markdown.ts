import { marked } from "marked";
import { slugify } from "@/lib/slug";

// Render admin-authored markdown to HTML for the public blog. Content is
// trusted (admin-only writes), so we render directly. GFM on, headings get
// ids for in-page anchors.
marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(md: string): string {
  const html = marked.parse(md ?? "", { async: false }) as string;
  // Data tables are wide and the article column is not. Wrapping each table in
  // its own scroll container keeps the page from scrolling sideways as a whole,
  // which is the failure mode on phones.
  return html.replace(/<table>/g, '<div class="table-scroll"><table>').replace(/<\/table>/g, "</table></div>");
}

export interface ArticleHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface RenderedArticle {
  html: string;
  /** H2/H3 in document order, each with the anchor id it was given. */
  headings: ArticleHeading[];
  /** Bullets from a "## Key takeaways" (or "TL;DR") section, lifted out of the
   *  body so the template can show them in the takeaways box instead. */
  liftedTakeaways: string[];
  wordCount: number;
}

// "## Key takeaways", "## TL;DR", "## Summary" followed by a bullet list.
const TAKEAWAYS_SECTION = /^##[ \t]+(?:key[ \t]+takeaways?|tl;?dr|in[ \t]+short|summary)[ \t]*\n+((?:[ \t]*[-*+][ \t]+.+(?:\n|$))+)/im;

const stripTags = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

/**
 * The blog template's renderer: markdown → HTML with anchor ids on every H2/H3
 * (for the contents list and deep links), plus what the template needs around
 * the body — headings, word count, and any takeaways the author wrote inline.
 */
export function renderArticle(md: string): RenderedArticle {
  let body = md ?? "";
  const liftedTakeaways: string[] = [];
  const m = TAKEAWAYS_SECTION.exec(body);
  if (m) {
    for (const line of m[1].split("\n")) {
      // The box renders plain text, so drop inline markdown rather than show it raw.
      const item = line
        .replace(/^[ \t]*[-*+][ \t]+/, "")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/(\*\*|__|`)/g, "")
        .replace(/(^|\s)[*_]([^*_]+)[*_](?=\s|[.,;:!?]|$)/g, "$1$2")
        .trim();
      if (item) liftedTakeaways.push(item);
    }
    body = (body.slice(0, m.index) + body.slice(m.index + m[0].length)).replace(/\n{3,}/g, "\n\n");
  }

  const headings: ArticleHeading[] = [];
  const used = new Map<string, number>();
  const html = renderMarkdown(body).replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, lvl: string, inner: string) => {
    const text = stripTags(inner);
    const base = slugify(text) || "section";
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    const id = n ? `${base}-${n + 1}` : base;
    headings.push({ id, text, level: lvl === "2" ? 2 : 3 });
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
  });

  // Count words in the prose a reader actually reads (not markdown syntax/URLs).
  const plain = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|~-]/g, " ");
  const wordCount = (plain.match(/[A-Za-z0-9£$%'’]+/g) ?? []).length;

  return { html, headings, liftedTakeaways, wordCount };
}

/** Minutes to read at ~220 wpm (minimum 1). */
export const readingMinutes = (words: number) => Math.max(1, Math.round(words / 220));
