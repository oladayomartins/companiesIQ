// One child sitemap chunk of public company report URLs.
import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/site";
import { companyChunk } from "@/lib/sitemap-companies";

export const revalidate = 86400;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number.parseInt(id, 10) || 0;
  const rows = await companyChunk(n);
  const urls = rows
    .map(
      (r) =>
        `<url><loc>${SITE_URL}/company/${r.number}</loc>${
          r.updated_at ? `<lastmod>${new Date(r.updated_at).toISOString()}</lastmod>` : ""
        }<changefreq>monthly</changefreq></url>`,
    )
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=86400" },
  });
}
