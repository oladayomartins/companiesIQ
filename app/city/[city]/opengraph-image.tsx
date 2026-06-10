import { CITIES } from "@/lib/cities";
import { slugify } from "@/lib/slug";
import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-template";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "UK city business activity — CompaniesIQ";
export const runtime = "nodejs";

function prettify(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function Image({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const match = CITIES.find((c) => slugify(c.name) === city);
  const title = match?.name ?? prettify(city);
  const sub = match ? `${match.region}  ·  Local company formation activity` : "Local company formation activity";
  return renderOg({ eyebrow: "City business activity", title, sub });
}
