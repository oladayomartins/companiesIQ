import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-template";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "UK business leads from Companies House — CompaniesIQ";
export const runtime = "nodejs";

export default function Image() {
  return renderOg({
    eyebrow: "UK business leads",
    title: "Fresh B2B leads from the register.",
    sub: "Filter new companies by sector & location, then export.",
  });
}
