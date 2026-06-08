// Canonical site origin for metadata, canonicals, sitemap and JSON-LD.
// Set NEXT_PUBLIC_SITE_URL to the real production domain in Vercel.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://companiesiq.co.uk").replace(/\/$/, "");
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
