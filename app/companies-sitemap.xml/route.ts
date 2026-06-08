// Sitemap INDEX for the public company reports. Lists one child sitemap per
// 45k-company chunk. Referenced from robots.txt alongside /sitemap.xml.
import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/site";
import { companyCount, SITEMAP_CHUNK } from "@/lib/sitemap-companies";

export const revalidate = 86400;

export async function GET() {
  const total = await companyCount();
  const chunks = Math.ceil(total / SITEMAP_CHUNK);
  const items = Array.from(
    { length: chunks },
    (_, i) => `<sitemap><loc>${SITE_URL}/companies-sitemap/${i}</loc></sitemap>`,
  ).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</sitemapindex>`;
  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=86400" },
  });
}
