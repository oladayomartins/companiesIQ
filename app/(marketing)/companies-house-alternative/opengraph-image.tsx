import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-template";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "A faster Companies House alternative — CompaniesIQ";
export const runtime = "nodejs";

export default function Image() {
  return renderOg({
    eyebrow: "Companies House alternative",
    title: "Search, monitor & export UK companies.",
    sub: "Everything the free register can't do — 5.5M companies, filtered.",
  });
}
