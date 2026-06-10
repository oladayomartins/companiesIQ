import { REGION_STATS } from "@/lib/ons";
import { slugify } from "@/lib/slug";
import { fmtNumber } from "@/lib/format";
import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-template";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "UK regional market intelligence — CompaniesIQ";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const stat = Object.values(REGION_STATS).find((r) => slugify(r.region) === region);
  const title = stat?.region ?? "UK region";
  const sub = stat
    ? `${fmtNumber(stat.population)} people  ·  ${stat.employmentRate.toFixed(1)}% employed  ·  ${stat.growthIndex.toFixed(2)}× growth index`
    : "Regional business & economic data";
  return renderOg({ eyebrow: "Regional market intelligence", title, sub });
}
