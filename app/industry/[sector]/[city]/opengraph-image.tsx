import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-template";
import { sectorForSlug, cityForSlug } from "@/lib/sector-city";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "New UK companies by sector and city — CompaniesIQ";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ sector: string; city: string }> }) {
  const { sector, city } = await params;
  const stat = sectorForSlug(sector);
  const c = cityForSlug(city);
  const title = stat && c ? `New ${stat.sector} companies in ${c.name}` : "New UK companies";
  const sub = c ? `${c.region} · live from the Companies House register` : "Live from the Companies House register";
  return renderOg({ eyebrow: "New companies", title, sub });
}
