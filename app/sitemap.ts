import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { ALL_SECTORS } from "@/lib/sic";
import { slugify } from "@/lib/slug";

// Static, content-bearing URLs. (Per-company report pages number in the millions
// and would need a generated, segmented sitemap index — out of scope here.)
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const marketing: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/sources`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/app/industries`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];
  const industries: MetadataRoute.Sitemap = ALL_SECTORS.map((sector) => ({
    url: `${SITE_URL}/app/industries/${slugify(sector)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  return [...marketing, ...industries];
}
