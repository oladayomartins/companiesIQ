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
// reports (/company/[number]) get their own segmented sitemap.
//
// lastmod policy: NEVER stamp deploy time (`new Date()`). Doing so bumps every
// URL's lastmod on every deploy, which makes Search Console re-evaluate all
// URLs each time (churn in the "discovered" count) and teaches Google to
// distrust our lastmod. Instead lastmod advances on a real content cadence:
//   · blog posts → their actual updated_at
//   · live-data landing pages (industry / market / city / signals / sector×city)
//     → start of the current ISO week (they refresh with new formations weekly)
//   · stable pages (marketing, SIC, alternatives, use-cases) → start of the
//     current month
// These change at most weekly/monthly regardless of how often we deploy.

/** 00:00 UTC on the Monday of the current ISO week. */
function startOfWeekUTC(d = new Date()): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  x.setUTCDate(x.getUTCDate() - dow);
  return x;
}
/** 00:00 UTC on the 1st of the current month. */
function startOfMonthUTC(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const weekly = startOfWeekUTC();
  const monthly = startOfMonthUTC();

  const marketing: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: weekly, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/product`, lastModified: monthly, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/data`, lastModified: monthly, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/pricing`, lastModified: monthly, changeFrequency: "monthly", priority: 0.8 },
    // Commercial keyword landing pages (bottom-of-funnel head terms).
    { url: `${SITE_URL}/company-database`, lastModified: monthly, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/business-leads`, lastModified: monthly, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/company-monitoring`, lastModified: monthly, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/companies-house-alternative`, lastModified: monthly, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/alternatives`, lastModified: monthly, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/use-cases`, lastModified: monthly, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/sic`, lastModified: monthly, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/free-alerts`, lastModified: monthly, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/sources`, lastModified: monthly, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: monthly, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/industry`, lastModified: weekly, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/market`, lastModified: weekly, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/city`, lastModified: weekly, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/signals`, lastModified: weekly, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/blog`, lastModified: weekly, changeFrequency: "weekly", priority: 0.7 },
  ];
  const industries: MetadataRoute.Sitemap = Object.values(SECTOR_STATS).map((s) => ({
    url: `${SITE_URL}/industry/${slugify(s.sector)}`,
    lastModified: weekly,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  const markets: MetadataRoute.Sitemap = Object.values(REGION_STATS).map((r) => ({
    url: `${SITE_URL}/market/${slugify(r.region)}`,
    lastModified: weekly,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  const cities: MetadataRoute.Sitemap = CITIES.map((c) => ({
    url: `${SITE_URL}/city/${slugify(c.name)}`,
    lastModified: weekly,
    changeFrequency: "weekly",
    priority: 0.5,
  }));
  const signals: MetadataRoute.Sitemap = SIGNALS.map((s) => ({
    url: `${SITE_URL}/signals/${s.slug}`,
    lastModified: weekly,
    changeFrequency: "weekly",
    priority: 0.5,
  }));
  // Only the curated high-value sector×city combos go in the sitemap; the rest
  // of the matrix is crawlable via the "by city" links on each sector page and
  // self-governs indexation (thin combos return robots:noindex). No live calls.
  const sectorCities: MetadataRoute.Sitemap = priorityCombos().map((c) => ({
    url: `${SITE_URL}/industry/${c.sectorSlug}/${c.citySlug}`,
    lastModified: weekly,
    changeFrequency: "weekly",
    priority: 0.5,
  }));
  const sicCodes: MetadataRoute.Sitemap = CURATED_SIC_CODES.map((code) => ({
    url: `${SITE_URL}/sic/${code}`,
    lastModified: monthly,
    changeFrequency: "monthly",
    priority: 0.5,
  }));
  const alternatives: MetadataRoute.Sitemap = COMPETITORS.map((c) => ({
    url: `${SITE_URL}/alternatives/${c.slug}`,
    lastModified: monthly,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  const useCases: MetadataRoute.Sitemap = USE_CASES.map((u) => ({
    url: `${SITE_URL}/use-cases/${u.slug}`,
    lastModified: monthly,
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
