// Canonical site origin for metadata, canonicals, sitemap and JSON-LD.
// MUST be the host the site actually serves on: the bare apex
// (companiesiq.co.uk) 308-redirects to www, so www is canonical and every
// canonical/OG/sitemap URL must use it — otherwise they point at a URL that
// immediately redirects. Override with NEXT_PUBLIC_SITE_URL in Vercel only if
// the canonical host changes (keep it in sync with the apex→www redirect).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.companiesiq.co.uk").replace(/\/$/, "");
export const SITE_NAME = "CompaniesIQ";
export const SITE_DESCRIPTION =
  "The UK company intelligence platform built on Companies House. Find newly registered companies, growing sectors and new-company alerts before competitors — a modern Companies House alternative for sales, lead generation and market intelligence.";

// Target search terms (woven into copy; also emitted as a keywords meta).
export const SITE_KEYWORDS = [
  "newly registered companies uk",
  "new businesses uk",
  "new companies house registrations",
  "companies house alternative",
  "company intelligence platform",
  "sales intelligence platform",
  "business intelligence platform",
  "lead generation database",
  "new business leads uk",
  "new company alerts",
  "uk company database",
  "business prospecting platform",
  "competitive intelligence uk",
  "market intelligence platform",
  "company formation trends uk",
  "uk company data",
  "new company formations",
  "sic code search",
];
