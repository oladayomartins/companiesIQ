import { marked } from "marked";

// Render admin-authored markdown to HTML for the public blog. Content is
// trusted (admin-only writes), so we render directly. GFM on, headings get
// ids for in-page anchors.
marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(md: string): string {
  return marked.parse(md ?? "", { async: false }) as string;
}
