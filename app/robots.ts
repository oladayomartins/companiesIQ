import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Allow the marketing pages + the public SEO surface (company reports at
// /company/*). Disallow the entire gated SaaS app (/app/*), the APIs, auth,
// and the private founder funnel (/visibility-review/*, also noindex per-page).
const ALLOW = ["/", "/company/"];
const DISALLOW = [
  "/api/",
  "/app/", // entire SaaS workspace is login-gated
  "/visibility-review/", // founder conversion funnel (noindex)
  "/sign-in",
  "/auth/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ALLOW,
        disallow: DISALLOW,
      },
      // AhrefsBot crawled ~10–11 company pages a minute in bursts (2026-10-08,
      // identified by the [ch-agents] logs). Each uncached company page costs
      // ~6 Companies House calls, so it alone drained the shared API key
      // (600 req / 5 min) and pages failed. AhrefsBot honours Crawl-delay:
      // 10s caps it at ~6 pages a minute while keeping the site in Ahrefs.
      // A crawler that matches a named group ignores "*", so the same
      // allow/disallow rules are repeated here.
      {
        userAgent: "AhrefsBot",
        allow: ALLOW,
        disallow: DISALLOW,
        crawlDelay: 10,
      },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/companies-sitemap.xml`],
    host: SITE_URL,
  };
}
