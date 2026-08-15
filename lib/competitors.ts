// ============================================================
// Competitor "alternative" pages — /alternatives/[competitor]
// ------------------------------------------------------------
// Fair, cited comparison pages targeting "[competitor] alternative"
// intent. Rules (see the seo-competitor-pages skill):
//   · Only VERIFIABLE public facts about competitors, each with a
//     source + "as of" date. Where a capability isn't publicly stated
//     we say so ("Not a stated focus" / "Not publicly listed") rather
//     than guess.
//   · Balanced: we credit where each competitor is genuinely stronger
//     (credit scores, contact data, global coverage, financials depth)
//     — CompaniesIQ does not offer those, and pretending otherwise
//     would be inaccurate.
//   · The narrative centres CompaniesIQ's real strengths: new-formation
//     intelligence (24h), the live UK register, market/sector trends,
//     the signals/alerts/watchlist layer, and self-serve free search.
// Review quarterly or when a competitor ships major changes.
// ============================================================
import type { IconName } from "@/components/ds";

export interface CompRow {
  dimension: string;
  ciq: string;
  them: string;
  ciqWin?: boolean; // highlight the CompaniesIQ cell where it's a genuine edge
}

export interface Source {
  label: string;
  url: string;
}

export interface Competitor {
  slug: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  whatTheyAre: string; // factual, sourced
  theirStrengths: string[]; // honest — where they're stronger
  ciqStrengths: { icon: IconName; title: string; body: string }[];
  rows: CompRow[];
  chooseThem: string; // honest "pick them if…"
  chooseCiq: string;
  faqs: [string, string][];
  sources: Source[];
  asOf: string;
  ogSub: string;
}

const AS_OF = "August 2026";

export const COMPETITORS: Competitor[] = [
  // ------------------------------------------------------------ Endole
  {
    slug: "endole",
    name: "Endole",
    metaTitle: "Endole Alternative — CompaniesIQ for UK new-company intelligence",
    metaDescription:
      "Looking for an Endole alternative? CompaniesIQ turns the live Companies House register into new-formation intelligence, market trends and change alerts — self-serve and free to search. An honest, side-by-side comparison.",
    h1: "The Endole alternative for new-company intelligence.",
    intro:
      "Endole is a strong UK company-data and credit tool. If what you actually need is to find newly formed companies early, read the market around them and get alerted when things change, CompaniesIQ is built for that — on the live register, self-serve, and free to search.",
    whatTheyAre:
      "Endole is a UK business intelligence platform focused on company data, credit insights and sales intelligence. It offers company and director profiles, credit reports (scores, limits and risk), decision-maker contact data, 50+ list-building filters, company monitoring, Know Your Business (KYB) checks and newly-formed company leads. It advertises a free basic platform; paid pricing is not publicly listed.",
    theirStrengths: [
      "Formal credit scores, credit limits and risk data on companies.",
      "Decision-maker contact data for direct outreach.",
      "Know Your Business (KYB) compliance checks.",
    ],
    ciqStrengths: [
      { icon: "bell", title: "New-formation intelligence, not just leads", body: "Every UK incorporation is searchable within 24 hours, wrapped in live market and sector context — so you're finding businesses to act on, not just buying a contact list." },
      { icon: "barChart", title: "Market & sector intelligence", body: "Formation, growth and survival trends by sector, region and city — an intelligence layer over the register, beyond single-company lookups." },
      { icon: "search", title: "Live full-register search & export", body: "Filter 5.5M companies by sector, region, size, age and status and export the list — the register as a prospecting and monitoring tool." },
      { icon: "check", title: "Self-serve and free to search", body: "Search the whole register free, no card, with transparent pricing — not a sales-led quote process." },
    ],
    rows: [
      { dimension: "Primary focus", ciq: "UK new-company & market intelligence", them: "UK company data, credit & sales intelligence" },
      { dimension: "New companies within 24h", ciq: "Yes — core", them: "Yes (newly-formed leads)", },
      { dimension: "Market / sector / region trends", ciq: "Yes", them: "Not a stated focus", ciqWin: true },
      { dimension: "Company monitoring & change alerts", ciq: "Yes", them: "Yes" },
      { dimension: "Credit scores / risk ratings", ciq: "No — signals from filed accounts", them: "Yes" },
      { dimension: "Decision-maker contact data", ciq: "No — public register data", them: "Yes" },
      { dimension: "Free to search", ciq: "Yes, no card", them: "Free basic platform; paid pricing on request", ciqWin: true },
      { dimension: "Geographic scope", ciq: "UK", them: "UK" },
      { dimension: "CSV export & API", ciq: "Yes", them: "Yes" },
    ],
    chooseThem:
      "Choose Endole if your priority is formal credit scores and risk ratings, or ready-made decision-maker phone and email contact data for outreach.",
    chooseCiq:
      "Choose CompaniesIQ if you want to find newly formed companies early, understand the market and sector around them, and monitor changes — all self-serve and free to start.",
    faqs: [
      [
        "What is the best Endole alternative?",
        "It depends on the job. If you need credit scores and contact data, Endole and credit bureaus are strong. If you need to find newly registered UK companies early, read sector and regional market trends, and monitor changes on the live Companies House register, CompaniesIQ is purpose-built for that — and free to search.",
      ],
      [
        "Does CompaniesIQ provide credit scores like Endole?",
        "No. CompaniesIQ surfaces financial signals from companies' own filed accounts (net worth, turnover, headcount where available), not formal credit scores or ratings. If a credit score is essential, a credit-focused provider like Endole is the better fit; CompaniesIQ focuses on new-formation and market intelligence.",
      ],
      [
        "Can CompaniesIQ find newly incorporated companies?",
        "Yes — that's a core use case. Every UK incorporation is classified and searchable within 24 hours, filterable by sector and location, with the market context around it and alerts when things change.",
      ],
      [
        "Is CompaniesIQ free?",
        "You can search the whole UK register and view companies free, with no card. Paid plans add unlimited reports, watchlist alerts and larger exports. See the pricing page.",
      ],
    ],
    sources: [{ label: "endole.co.uk", url: "https://www.endole.co.uk" }],
    asOf: AS_OF,
    ogSub: "New-formation intelligence, market trends & alerts — self-serve.",
  },

  // ------------------------------------------------------------ DataGardener
  {
    slug: "datagardener",
    name: "DataGardener",
    metaTitle: "DataGardener Alternative — CompaniesIQ for new-company intelligence",
    metaDescription:
      "A DataGardener alternative built for new formations. Both use Companies House data, but CompaniesIQ leads on new-company timeliness, market/sector trends and change alerts — self-serve and free to search. Honest side-by-side.",
    h1: "The DataGardener alternative for new formations.",
    intro:
      "DataGardener is a capable, financials-deep UK company database built on Companies House. CompaniesIQ uses the same public source but leads where DataGardener doesn't emphasise: finding newly formed companies within 24 hours, the market around them, and alerts when they change.",
    whatTheyAre:
      "DataGardener is a UK company intelligence platform built on Companies House data (reused under the Open Government Licence), covering 17.2M+ UK companies. It offers company financials, firmographics, advanced filtering by industry, size, location, turnover and risk, directorship-change tracking, company monitoring, CSV/Excel export and a company-data API. Pricing is not publicly listed.",
    theirStrengths: [
      "Deep company financials and firmographic detail.",
      "A large UK record set (17.2M+ companies).",
      "Risk assessment and directorship-change tracking.",
    ],
    ciqStrengths: [
      { icon: "bell", title: "New formations within 24h", body: "Every UK incorporation is searchable within a day, with new-company alerts — new-formation timing is a core focus, not an afterthought." },
      { icon: "barChart", title: "Market & sector intelligence", body: "Formation, growth and survival trends by sector, region and city, so you can size a market — not just look companies up one by one." },
      { icon: "bell", title: "Signals, watchlists & alerts", body: "Track companies and get told when they file, appoint or lose a director, register a charge, move or dissolve." },
      { icon: "check", title: "Self-serve and free to search", body: "Search the whole register free with no card and transparent pricing, rather than a quote-led process." },
    ],
    rows: [
      { dimension: "Primary focus", ciq: "UK new-company & market intelligence", them: "UK company data, financials & risk" },
      { dimension: "Built on Companies House data", ciq: "Yes (queried live)", them: "Yes (Open Government Licence)" },
      { dimension: "New companies within 24h", ciq: "Yes — core", them: "Not a stated focus", ciqWin: true },
      { dimension: "Market / sector / region trends", ciq: "Yes", them: "Not a stated focus", ciqWin: true },
      { dimension: "Company monitoring & change alerts", ciq: "Yes", them: "Yes" },
      { dimension: "Company financials depth", ciq: "Signals from filed accounts", them: "Yes — detailed financials" },
      { dimension: "Free to search", ciq: "Yes, no card", them: "Pricing on request", ciqWin: true },
      { dimension: "CSV export & API", ciq: "Yes", them: "Yes" },
    ],
    chooseThem:
      "Choose DataGardener if your priority is the deepest company financials and firmographic enrichment across the widest UK record set.",
    chooseCiq:
      "Choose CompaniesIQ if you want to catch newly formed companies early, read the market and sector trends around them, and monitor changes — self-serve and free to start.",
    faqs: [
      [
        "How is CompaniesIQ different from DataGardener?",
        "Both are UK company intelligence platforms built on Companies House data. DataGardener leads on detailed financials and firmographics across a large record set. CompaniesIQ leads on new-formation timeliness (companies within 24 hours), market and sector trend intelligence, and the signals/alerts layer — and is free to search self-serve.",
      ],
      [
        "Do both use Companies House data?",
        "Yes. Both reuse the public Companies House register under the Open Government Licence. CompaniesIQ queries it live so results reflect the register as it stands, and classifies new incorporations within 24 hours.",
      ],
      [
        "Can I track new companies and get alerts?",
        "Yes. Add companies, sectors or regions to a watchlist and CompaniesIQ alerts you as new companies incorporate and when tracked companies file, change directors or change status.",
      ],
      [
        "Is CompaniesIQ free to try?",
        "Yes — search the whole register and view companies free, no card. Upgrade for unlimited reports, alerts and larger exports. See pricing for limits.",
      ],
    ],
    sources: [{ label: "datagardener.com", url: "https://www.datagardener.com" }],
    asOf: AS_OF,
    ogSub: "New-formation timeliness, market trends & alerts — self-serve.",
  },

  // ------------------------------------------------------------ Global Database
  {
    slug: "global-database",
    name: "Global Database",
    metaTitle: "Global Database Alternative — CompaniesIQ for UK company intelligence",
    metaDescription:
      "A Global Database alternative focused on the UK. Global Database is global and contact-data-led; CompaniesIQ goes deep on UK new formations, the live register and market trends — self-serve and free to search. Honest comparison.",
    h1: "The Global Database alternative for UK company intelligence.",
    intro:
      "Global Database is a broad, global B2B data and enrichment platform. If your focus is the UK — finding newly formed companies, understanding the market, and monitoring change on the live register — CompaniesIQ goes deeper on exactly that, self-serve and free to search.",
    whatTheyAre:
      "Global Database is a global B2B company intelligence and data-enrichment platform covering 600M+ companies across 190+ countries. It offers company verification and monitoring, contact-data enrichment, financial and credit reporting, shareholder/UBO identification, list enrichment, sales-engagement and ABM tooling, a browser extension and an API. Pricing is quote-based, with a free trial; specific figures are not publicly listed.",
    theirStrengths: [
      "Global coverage — 600M+ companies across 190+ countries.",
      "Contact-data enrichment and sales-engagement tooling.",
      "Account-based marketing and cross-market workflows.",
    ],
    ciqStrengths: [
      { icon: "bell", title: "UK new-formation intelligence", body: "Every UK incorporation searchable within 24 hours, with the market context around it — a depth of new-company focus a global generalist doesn't emphasise." },
      { icon: "globe", title: "Live UK register, in full", body: "The complete UK Companies House register queried live, with officers, PSCs, charges, accounts and filings assembled per company." },
      { icon: "barChart", title: "Market & sector intelligence", body: "UK formation, growth and survival trends by sector, region and city to size a market or spot what's emerging." },
      { icon: "check", title: "Self-serve and free to search", body: "Search the whole UK register free, no card, no quote — start in seconds instead of requesting pricing." },
    ],
    rows: [
      { dimension: "Primary focus", ciq: "UK new-company & market intelligence", them: "Global B2B data & enrichment" },
      { dimension: "Geographic scope", ciq: "UK — full register", them: "Global (600M+, 190+ countries)" },
      { dimension: "New companies within 24h", ciq: "Yes — core", them: "Not a stated focus", ciqWin: true },
      { dimension: "Market / sector / region trends", ciq: "Yes (UK)", them: "Not a stated focus", ciqWin: true },
      { dimension: "Contact data (email / phone)", ciq: "No — public register data", them: "Yes" },
      { dimension: "Company monitoring & change alerts", ciq: "Yes", them: "Yes" },
      { dimension: "Free to search / self-serve", ciq: "Yes, no card", them: "Free trial; pricing via quote", ciqWin: true },
      { dimension: "CSV export & API", ciq: "Yes", them: "Yes" },
    ],
    chooseThem:
      "Choose Global Database if you need multi-country coverage, contact-data enrichment, or sales-engagement tooling across several markets.",
    chooseCiq:
      "Choose CompaniesIQ if the UK is your market and you want new-formation depth, live-register company intelligence and market trends — self-serve and free to start.",
    faqs: [
      [
        "What is a good UK-focused Global Database alternative?",
        "If your market is the UK, CompaniesIQ goes deeper on UK company intelligence than a global generalist: the full Companies House register queried live, new incorporations within 24 hours, UK sector and regional trends, and monitoring — all self-serve and free to search.",
      ],
      [
        "Does CompaniesIQ cover companies outside the UK?",
        "No — CompaniesIQ is focused on the UK Companies House register. If you need multi-country coverage, a global provider like Global Database is the better fit. The trade-off is depth: CompaniesIQ goes further on UK new formations, market intelligence and monitoring.",
      ],
      [
        "Does CompaniesIQ provide contact data?",
        "CompaniesIQ surfaces public register data — companies, officers, PSCs, filings and financial signals — not verified email or phone contact data. For contact enrichment, a contact-data provider is the better fit.",
      ],
      [
        "Is CompaniesIQ free to try?",
        "Yes — search the whole UK register and view companies free, with no card and no quote process. Upgrade for unlimited reports, alerts and larger exports.",
      ],
    ],
    sources: [{ label: "globaldatabase.com", url: "https://www.globaldatabase.com" }],
    asOf: AS_OF,
    ogSub: "UK new formations, live register & market trends — self-serve.",
  },
];

export function getCompetitor(slug: string): Competitor | undefined {
  return COMPETITORS.find((c) => c.slug === slug);
}
