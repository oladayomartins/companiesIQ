import { getCompany } from "@/lib/companies-house";
import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-template";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Company intelligence — CompaniesIQ";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  let title = `Company ${number}`;
  let sub = "";
  try {
    const c = await getCompany(number);
    title = c.name;
    sub = [
      c.primaryClassification?.sector,
      c.geo?.region && c.geo.region !== "Unknown" ? c.geo.region : null,
      c.incorporated ? `inc. ${c.incorporated.slice(0, 4)}` : null,
    ]
      .filter(Boolean)
      .join("  ·  ");
  } catch {
    /* fall back to the company number */
  }
  return renderOg({ eyebrow: "Company intelligence", title, sub: sub || `Company ${number}` });
}
