import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { SECTOR_STATS, REGION_STATS } from "@/lib/ons";
import { slugify } from "@/lib/slug";

// Static, content-bearing URLs: marketing + the public SEO landing pages
// (industry + market, including every sector and region). The public company
// reports (/company/[number]) number in the millions and are discovered via
// internal links from these pages + crawling; a generated, segmented sitemap
// index for them is a later step (alongside /city and /signals pages).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const marketing: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/sources`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/industry`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/market`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];
  const industries: MetadataRoute.Sitemap = Object.values(SECTOR_STATS).map((s) => ({
    url: `${SITE_URL}/industry/${slugify(s.sector)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  const markets: MetadataRoute.Sitemap = Object.values(REGION_STATS).map((r) => ({
    url: `${SITE_URL}/market/${slugify(r.region)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  return [...marketing, ...industries, ...markets];
}
