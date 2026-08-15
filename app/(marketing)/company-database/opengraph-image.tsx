import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-template";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "The UK company database — CompaniesIQ";
export const runtime = "nodejs";

export default function Image() {
  return renderOg({
    eyebrow: "UK company database",
    title: "5.5M UK companies, searchable.",
    sub: "Filter by sector, region, size & date — then export.",
  });
}
