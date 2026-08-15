import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { SECTOR_STATS, REGION_STATS } from "@/lib/ons";
import { slugify } from "@/lib/slug";
import { SIGNALS } from "@/lib/signals";
import { CITIES } from "@/lib/cities";
import { priorityCombos } from "@/lib/sector-city";
import { CURATED_SIC_CODES } from "@/lib/sic";
import { USE_CASES } from "@/lib/use-cases";
import { COMPETITORS } from "@/lib/competitors";
import { getPublishedPosts } from "@/lib/posts";

// Static, content-bearing URLs: marketing + the public SEO landing pages
// (industry + market, including every sector and region). The public company
// reports (/company/[number]) number in the millions and are discovered via
// internal links from these pages + crawling; a generated, segmented sitemap
// index for them is a later step (alongside /city and /signals pages).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const marketing: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/product`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/data`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    // Commercial keyword landing pages (bottom-of-funnel head terms).
    { url: `${SITE_URL}/company-database`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/business-leads`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/company-monitoring`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/companies-house-alternative`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/alternatives`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/use-cases`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/sic`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/free-alerts`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/sources`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/industry`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/market`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/city`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/signals`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
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
  const cities: MetadataRoute.Sitemap = CITIES.map((c) => ({
    url: `${SITE_URL}/city/${slugify(c.name)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));
  const signals: MetadataRoute.Sitemap = SIGNALS.map((s) => ({
    url: `${SITE_URL}/signals/${s.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));
  // Only the curated high-value sector×city combos go in the sitemap; the rest
  // of the matrix is crawlable via the "by city" links on each sector page and
  // self-governs indexation (thin combos return robots:noindex). No live calls.
  const sectorCities: MetadataRoute.Sitemap = priorityCombos().map((c) => ({
    url: `${SITE_URL}/industry/${c.sectorSlug}/${c.citySlug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));
  const sicCodes: MetadataRoute.Sitemap = CURATED_SIC_CODES.map((code) => ({
    url: `${SITE_URL}/sic/${code}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));
  const alternatives: MetadataRoute.Sitemap = COMPETITORS.map((c) => ({
    url: `${SITE_URL}/alternatives/${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  const useCases: MetadataRoute.Sitemap = USE_CASES.map((u) => ({
    url: `${SITE_URL}/use-cases/${u.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const posts = await getPublishedPosts().catch(() => []);
  const blog: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  return [...marketing, ...industries, ...markets, ...cities, ...signals, ...sectorCities, ...sicCodes, ...alternatives, ...useCases, ...blog];
}
