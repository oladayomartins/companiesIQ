import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-template";
import { classifySic, sicCategory } from "@/lib/sic";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "UK SIC code — CompaniesIQ";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const category = sicCategory(code);
  const cls = classifySic(code);
  return renderOg({
    eyebrow: "SIC code",
    title: category ? `SIC ${code}: ${category}` : `SIC code ${code}`,
    sub: category ? `${cls.sector} · UK companies registered under this code` : "UK Standard Industrial Classification",
  });
}
