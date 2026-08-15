import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-template";
import { getUseCase } from "@/lib/use-cases";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "UK company intelligence for your profession — CompaniesIQ";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ persona: string }> }) {
  const { persona } = await params;
  const uc = getUseCase(persona);
  return renderOg({
    eyebrow: uc?.forLabel ?? "Use cases",
    title: uc?.ogTitle ?? "UK company intelligence for your job.",
    sub: uc?.ogSub ?? "Find newly registered companies and build prospect lists.",
  });
}
