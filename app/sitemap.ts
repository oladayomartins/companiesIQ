import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Static, content-bearing URLs. The public company reports (/company/[number])
// number in the millions and are discovered via internal links + crawling; a
// generated, segmented sitemap index for them is Phase 2 (alongside the public
// /industry, /market, /city and /signals SEO landing pages).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/sources`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
