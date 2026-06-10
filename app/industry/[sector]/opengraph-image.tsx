import { SECTOR_STATS } from "@/lib/ons";
import { slugify } from "@/lib/slug";
import { fmtNumber } from "@/lib/format";
import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-template";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "UK industry intelligence — CompaniesIQ";
export const runtime = "nodejs";

function prettify(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function Image({ params }: { params: Promise<{ sector: string }> }) {
  const { sector } = await params;
  const stat = Object.values(SECTOR_STATS).find((s) => slugify(s.sector) === sector);
  const title = stat?.sector ?? prettify(sector);
  const sub = stat
    ? `${fmtNumber(stat.businesses)} businesses  ·  +${stat.annualGrowth}% growth  ·  ${stat.survival.fiveYear}% 5yr survival`
    : "UK sector formation & survival data";
  return renderOg({ eyebrow: "Industry intelligence", title, sub });
}
