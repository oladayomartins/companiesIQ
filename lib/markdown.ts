import { marked } from "marked";

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
