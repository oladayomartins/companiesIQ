import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-template";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Company monitoring & Companies House alerts — CompaniesIQ";
export const runtime = "nodejs";

export default function Image() {
  return renderOg({
    eyebrow: "Company monitoring",
    title: "Get told the moment a company changes.",
    sub: "Directors, filings, charges & dissolutions — on a watchlist.",
  });
}
