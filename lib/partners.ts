// ============================================================
// Partner branding config for the founder Growth Report (funnel)
// ------------------------------------------------------------
// GOVERNANCE (docs/architecture.md): partners — incl. DigitWarehouse —
// may customize ONLY branding, CTAs, booking links and packages here.
// They may NEVER modify market data, statistics, insights, or report
// conclusions — CompaniesIQ owns the intelligence layer. This file is
// presentation config only (no data), and is client-safe (no secrets).
// ============================================================

export interface PartnerPackage {
  name: string;
  price: string;
  recommended?: boolean;
  features: string[];
}

export interface Partner {
  id: string;
  name: string;
  tagline: string;
  ctaHeadline: string;
  bookingUrl: string;
  bookingLabel: string;
  packages: PartnerPackage[];
}

export const PARTNERS: Record<string, Partner> = {
  digitwarehouse: {
    id: "digitwarehouse",
    name: "DigitWarehouse",
    tagline: "Web, local SEO and AI visibility for newly registered UK businesses.",
    ctaHeadline: "Get found by the customers already searching for you.",
    bookingUrl: "https://digitwarehouse.com/book", // TODO: replace with the real booking link
    bookingLabel: "Book a Free Visibility Review",
    packages: [
      {
        name: "Launch",
        price: "£500",
        features: ["5-page website", "Mobile responsive", "Contact form", "Analytics", "SSL", "Basic SEO"],
      },
      {
        name: "Growth",
        price: "£1,000",
        recommended: true,
        features: [
          "Everything in Launch",
          "Google Business Profile setup",
          "GBP optimisation",
          "Local SEO",
          "Citations",
          "Keyword research",
          "Review strategy",
        ],
      },
      {
        name: "Visibility",
        price: "£1,500",
        features: [
          "Everything in Growth",
          "AI visibility optimisation",
          "LLM discoverability",
          "Structured data",
          "Entity optimisation",
          "Competitor benchmarking",
        ],
      },
    ],
  },
};

export const DEFAULT_PARTNER = "digitwarehouse";

/** Resolve a partner from the `source` query param (the QR campaign tag). */
export function getPartner(source?: string | null): Partner {
  return PARTNERS[(source || "").toLowerCase()] || PARTNERS[DEFAULT_PARTNER];
}
