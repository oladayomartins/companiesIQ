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
      // ShapBot (Parallel's AI search/research crawler) hit ~145 company pages
      // a minute on 2026-10-08 and emptied the shared Companies House key.
      // Company pages are the only pages that cost Companies House calls, so
      // ShapBot is kept off /company/ but may crawl everything else (so the
      // site can still appear in Parallel's results). Allow lists only "/":
      // an equally specific Allow: /company/ would beat the Disallow.
      // Crawl-delay is added in case it honours it; that isn't documented.
      {
        userAgent: "ShapBot",
        allow: ["/"],
        disallow: [...DISALLOW, "/company/"],
        crawlDelay: 10,
      },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/companies-sitemap.xml`],
    host: SITE_URL,
  };
}
