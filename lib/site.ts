// Canonical site origin for metadata, canonicals, sitemap and JSON-LD.
// Set NEXT_PUBLIC_SITE_URL to the real production domain in Vercel.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://companiesiq.co.uk").replace(/\/$/, "");
export const SITE_NAME = "CompaniesIQ";
export const SITE_DESCRIPTION =
  "Evidence-based UK business intelligence from the public register — 5.5M live companies, with industry, regional and survival data you can search, track and trust.";
