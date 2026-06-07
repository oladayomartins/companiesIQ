import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Allow the marketing pages + the indexable content (company reports, industry
// pages). Disallow the interactive app tools, APIs, auth, and the conversion
// funnel (which is also noindex at the page level).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/app/company/", "/app/industries"],
        disallow: [
          "/api/",
          "/app/companies",
          "/app/markets",
          "/app/alerts",
          "/app/watchlists",
          "/app/settings",
          "/app/campaigns",
          "/app/director/",
          "/company/", // founder growth-report funnel (noindex)
          "/sign-in",
          "/auth/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
