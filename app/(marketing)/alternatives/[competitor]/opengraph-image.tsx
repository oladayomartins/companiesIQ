import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-template";
import { getCompetitor } from "@/lib/competitors";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "CompaniesIQ comparison — UK company intelligence";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ competitor: string }> }) {
  const { competitor } = await params;
  const c = getCompetitor(competitor);
  return renderOg({
    eyebrow: c ? `${c.name} alternative` : "Comparison",
    title: c ? `CompaniesIQ vs ${c.name}` : "CompaniesIQ comparison",
    sub: c?.ogSub ?? "UK new-company intelligence — self-serve.",
  });
}
