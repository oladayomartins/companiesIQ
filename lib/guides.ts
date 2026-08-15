// Curated internal links to the commercial blog cluster. These are rendered on
// the highest-authority public pages (company reports + industry/city/market
// landing pages) so authority + crawl signals flow to the buyer-intent guides
// that currently rank page 3-9. Keyword-rich anchors, all pointing at published
// /blog/ slugs. Keep anchors varied (not identical) across pages.

export interface Guide {
  label: string; // anchor text (keyword-rich)
  href: string;
}

// The buyer-intent cluster we want to push up (from the GSC gap analysis).
const G = {
  newlyRegistered: { label: "How to find newly registered companies", href: "/blog/newly-registered-companies-uk" },
  companiesFormedToday: { label: "See companies formed today", href: "/blog/companies-formed-today-uk" },
  newBusinessLeads: { label: "New business leads from Companies House", href: "/blog/new-business-leads-companies-house" },
  ukBusinessLeads: { label: "The UK business leads playbook", href: "/blog/uk-business-leads" },
  ukCompanyDatabase: { label: "The UK company database, explained", href: "/blog/uk-company-database" },
  directorSearch: { label: "Company director search: how it works", href: "/blog/company-director-search-uk" },
  whoOwns: { label: "Who owns a company in the UK?", href: "/blog/who-owns-a-company-uk" },
  filings: { label: "How to read a company's filing history", href: "/blog/company-filings-history-explained" },
  chAlternatives: { label: "Companies House search alternatives", href: "/blog/companies-house-search-alternatives" },
  salesIntelligence: { label: "What is a sales intelligence platform?", href: "/blog/sales-intelligence-platform" },
  monitoring: { label: "Monitor companies for changes & alerts", href: "/blog/company-monitoring-alerts-uk" },
  sicCodes: { label: "SIC codes: target companies by industry", href: "/blog/sic-codes-explained" },
  accountingLeads: { label: "Win accounting clients from new companies", href: "/blog/accounting-leads-new-companies" },
  marketingLeads: { label: "Marketing agency leads", href: "/blog/marketing-agency-leads-uk" },
  recruitmentLeads: { label: "Recruitment agency leads", href: "/blog/recruitment-agency-leads-uk" },
  constructionLeads: { label: "Construction company leads", href: "/blog/construction-company-leads-uk" },
  highGrowth: { label: "Finding high-growth & funded companies", href: "/blog/high-growth-companies-uk" },
  startupDb: { label: "Building a UK startup database", href: "/blog/startup-database-uk" },
  // Educational "Know" pillars (round-3 blog). NOTE: these resolve only once the
  // round-3 articles are published (scripts/seed-blog-education.mjs) — the
  // getters below that use them must not ship live before that.
  howCHWorks: { label: "How Companies House works", href: "/blog/how-companies-house-works" },
  researchCompany: { label: "How to research a UK company", href: "/blog/how-to-research-a-uk-company" },
  companyTypes: { label: "UK company types explained", href: "/blog/uk-company-types-explained" },
  companyAccounts: { label: "Company accounts explained", href: "/blog/company-accounts-explained" },
  confirmationStatement: { label: "What is a confirmation statement?", href: "/blog/confirmation-statement-explained" },
  companyStatus: { label: "Company status meanings", href: "/blog/company-status-meanings" },
} as const;

// A single company report — reader is looking at one company: lead them to the
// person/ownership/filing guides and the "find more like this" guides.
const COMPANY_GUIDES: Guide[] = [G.directorSearch, G.whoOwns, G.filings, G.newlyRegistered, G.ukCompanyDatabase, G.chAlternatives];

// Sector-specific lead guide, where one exists, to keep anchors relevant.
const SECTOR_LEAD: Record<string, Guide> = {
  Construction: G.constructionLeads,
  "Professional services": G.accountingLeads,
  Technology: G.salesIntelligence,
  "Financial services": G.highGrowth,
};

/** Guides for an industry/sector landing page. */
export function guidesForSector(sector?: string): Guide[] {
  const lead = sector ? SECTOR_LEAD[sector] : undefined;
  const base = [G.newlyRegistered, G.newBusinessLeads, G.ukCompanyDatabase, G.salesIntelligence, G.monitoring, G.sicCodes];
  return dedupe(lead ? [lead, ...base] : base).slice(0, 6);
}

/** Remove duplicate guides by href (a sector lead may also be in the base set). */
function dedupe(guides: Guide[]): Guide[] {
  const seen = new Set<string>();
  return guides.filter((g) => (seen.has(g.href) ? false : (seen.add(g.href), true)));
}

/** Guides for a city or region landing page. */
export function guidesForPlace(): Guide[] {
  return [G.newlyRegistered, G.companiesFormedToday, G.newBusinessLeads, G.ukBusinessLeads, G.ukCompanyDatabase, G.startupDb];
}

/** Guides for a single company report. */
export function guidesForCompany(): Guide[] {
  return COMPANY_GUIDES;
}

// ---------------------------------------------------------------------------
// Educational-cluster getters — surface the "Know" pillars on the SIC and
// commercial data pages, closing the internal-link loop (educational content
// links down to product; product/data pages link back up to the explainers).
// Each mixes new pillars with a relevant already-published explainer.
// ---------------------------------------------------------------------------

/** For the /sic and /sic/[code] pages — classification & register basics. */
export function guidesForSic(): Guide[] {
  return [G.sicCodes, G.companyTypes, G.howCHWorks, G.researchCompany];
}

/** For /company-database — research & the register, database-oriented. */
export function guidesForData(): Guide[] {
  return [G.howCHWorks, G.researchCompany, G.companyTypes, G.companyAccounts, G.sicCodes, G.ukCompanyDatabase];
}

/** For /company-monitoring — status, filings & tracking. */
export function guidesForMonitoring(): Guide[] {
  return [G.howCHWorks, G.researchCompany, G.companyStatus, G.confirmationStatement, G.companyAccounts, G.monitoring];
}
