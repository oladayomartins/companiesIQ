import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-template";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "UK formation signal — CompaniesIQ";
export const runtime = "nodejs";

function prettify(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function Image({ params }: { params: Promise<{ keyword: string }> }) {
  const { keyword } = await params;
  return renderOg({
    eyebrow: "Formation signal",
    title: prettify(keyword),
    sub: "Newly registered companies matching this theme",
  });
}
