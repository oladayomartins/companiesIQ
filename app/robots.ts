import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Allow the marketing pages + the public SEO surface (company reports at
// /company/*). Disallow the entire gated SaaS app (/app/*), the APIs, auth,
// and the private founder funnel (/visibility-review/*, also noindex per-page).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/company/"],
        disallow: [
          "/api/",
          "/app/", // entire SaaS workspace is login-gated
          "/visibility-review/", // founder conversion funnel (noindex)
          "/sign-in",
          "/auth/",
        ],
      },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/companies-sitemap.xml`],
    host: SITE_URL,
  };
}
