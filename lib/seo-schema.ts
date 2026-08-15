// ============================================================
// Shared JSON-LD builders for the commercial landing pages
// ------------------------------------------------------------
// The industry/market/product/data pages each hand-roll their
// BreadcrumbList / WebPage / FAQPage objects. These helpers emit
// exactly that shape so the new /companies-house-alternative,
// /company-database, /company-monitoring and /business-leads
// pages stay consistent without repeating the boilerplate.
// ============================================================
import { SITE_URL, SITE_NAME } from "./site";

/** BreadcrumbList from an ordered [name, path] trail (paths are site-relative). */
export function breadcrumbLd(trail: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${SITE_URL}${path}`,
    })),
  };
}

/** WebPage node tied to the global WebSite. */
export function webPageLd({ name, path, description }: { name: string; path: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    url: `${SITE_URL}${path}`,
    description,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  };
}

/** FAQPage from [question, answer] pairs — feeds rich results and AI answers. */
export function faqLd(faqs: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}
