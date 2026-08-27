import Link from "next/link";
import type { Metadata } from "next";
import { Badge, Button, Icon, type IconName } from "@/components/ds";
import { SiteFooter } from "@/components/marketing/Footer";
import { JsonLd } from "@/components/JsonLd";
import { fmtNumber } from "@/lib/format";
import { getRegisterKpis } from "@/lib/live-stats";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Data & coverage — UK company data from Companies House",
  description:
    "The UK company data behind CompaniesIQ: the full Companies House register — 5.5M companies, officers, PSCs, charges, filings and accounts — queried live and reused under the Open Government Licence.",
  alternates: { canonical: "/data" },
  openGraph: {
    title: "CompaniesIQ Data & coverage — UK company data",
    description:
      "The full Companies House register — 5.5M companies, officers, PSCs, charges, filings and accounts — queried live under the Open Government Licence.",
    url: `${SITE_URL}/data`,
    type: "website",
  },
};

// What's in the data — each item is a real field set the register exposes.
const DATA_TYPES: { icon: IconName; title: string; body: string }[] = [
  { icon: "building", title: "Companies", body: "Name, company number, type, incorporation date, registered office, SIC activity codes and live register status for every UK company." },
  { icon: "users", title: "Officers & PSCs", body: "Current and resigned directors and secretaries, plus persons with significant control — who owns and controls each company." },
  { icon: "file", title: "Filing history", body: "Up to a decade of filings per company — accounts, confirmation statements, officer changes and more, each with its date." },
  { icon: "shield", title: "Charges", body: "Mortgages and charges registered against a company: lender, status and dates — a signal of borrowing and security." },
  { icon: "barChart", title: "Accounts & financials", body: "Where a company files machine-readable (iXBRL) accounts, we surface net worth, turnover, cash and headcount as a signal." },
  { icon: "globe", title: "Markets & regions", body: "Millions of filings rolled up by SIC sector, UK region and city, with ONS and Nomis for regional economic context." },
];

const BREADCRUMB = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
    { "@type": "ListItem", position: 2, name: "Data & coverage", item: `${SITE_URL}/data` },
  ],
};

const WEBPAGE = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Data & coverage — CompaniesIQ",
  url: `${SITE_URL}/data`,
  description:
    "What UK company data CompaniesIQ covers, how fresh it is and where it comes from — the full Companies House register plus ONS and Nomis context.",
  isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
};

// Dataset schema — describes the underlying data for SEO/GEO (AI engines and
// dataset search understand this type). Kept honest: source, licence, coverage.
const DATASET = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "UK company register intelligence — CompaniesIQ",
  description:
    "The full UK Companies House register — around 5.5 million companies with their officers, persons with significant control, charges, filing history and accounts — queried live and enriched with ONS and Nomis regional statistics.",
  url: `${SITE_URL}/data`,
  license: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
  creator: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  isBasedOn: "https://www.gov.uk/government/organisations/companies-house",
  spatialCoverage: { "@type": "Place", name: "United Kingdom" },
  keywords: ["UK companies", "Companies House", "company data", "new company formations", "SIC codes", "PSC"],
  measurementTechnique: "Live Companies House REST API, with ONS and Nomis reference statistics",
};

const FAQS: [string, string][] = [
  [
    "What data does CompaniesIQ cover?",
    "The entire UK Companies House register: around 5.5 million companies with their names, numbers, addresses, SIC activity codes and status, plus officers, persons with significant control (PSCs), charges, up to a decade of filing history, and — where filed in machine-readable form — accounts figures. Regional and sector context is added from ONS and Nomis.",
  ],
  [
    "How many UK companies are in the data?",
    "The register holds several million live companies at any time (roughly 5.5 million active), and CompaniesIQ covers all of them. Because it queries Companies House live rather than holding a private copy, the count you see reflects the register as it currently stands.",
  ],
  [
    "How often is the data updated?",
    "Company and register data is queried live from Companies House, so it is current at the moment you view it. New incorporations are classified and made searchable within 24 hours of appearing on the register.",
  ],
  [
    "Where does the data come from, and can I trust it?",
    "All company data is public record from Companies House, reused under the Open Government Licence v3.0. Regional labour-market context comes from ONS and Nomis. Every figure is sourced and dated, and nothing is fabricated — where a value can't be measured, it is marked 'Not Assessed' rather than guessed.",
  ],
  [
    "Is the data free to use, and what's the licence?",
    "The underlying Companies House data is Crown copyright, reused under the Open Government Licence v3.0, which permits reuse with attribution — shown on every report and in our footer. You can read and export what you need on the platform; plans set the export and API limits.",
  ],
  [
    "Can I export the data or access it via API?",
    "Yes. Any search, report or list exports to CSV, and Pro plans add API access for pulling companies and signals into your own tools. See the pricing page for per-plan limits.",
  ],
];

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(([q, a]) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default async function DataPage() {
  const kpis = await getRegisterKpis(30).catch(() => null);

  return (
    <main className="site" id="main-content" tabIndex={-1}>
      <JsonLd data={[WEBPAGE, DATASET, BREADCRUMB, FAQ_SCHEMA]} />

      <section className="pricing-hero">
        <span className="eyebrow">Data &amp; coverage</span>
        <h1 className="pricing-hero__title">The UK company data behind every answer.</h1>
        <p className="pricing-hero__sub">
          CompaniesIQ is built on the full Companies House register — every company, officer, owner, charge and filing —
          queried live and reused under the Open Government Licence. Here&apos;s exactly what that covers, how fresh it
          is, and where it comes from.
        </p>
        <div className="bill-toggle" style={{ gap: 10, flexWrap: "wrap" }}>
          <Badge tone="pos" dot>
            {kpis ? `${fmtNumber(kpis.active)} live companies` : "5.5M live companies"}
          </Badge>
          <Badge tone="neutral">Full UK register</Badge>
          <Badge tone="neutral">Updated within 24h</Badge>
          <Badge tone="neutral">Open Government Licence</Badge>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <span className="eyebrow">What&apos;s in the data</span>
          <h2 className="section__title">The whole register, not just names and numbers.</h2>
        </div>
        <div className="feat-grid">
          {DATA_TYPES.map((d) => (
            <div className="feat" key={d.title}>
              <span className="feat__icon">
                <Icon name={d.icon} size={20} />
              </span>
              <h3 className="feat__title">{d.title}</h3>
              <p className="feat__body">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--alt">
        <div className="section__head">
          <span className="eyebrow">Coverage &amp; freshness</span>
          <h2 className="section__title">Live, complete and dated.</h2>
        </div>
        <div className="faq-grid">
          <div className="faq-item">
            <h3 className="faq-item__q">Complete</h3>
            <p className="faq-item__a">
              Every company on the UK register — around 5.5 million live companies plus dissolved history — not a sampled
              subset. Explore it by <Link href="/industry">industry</Link>, <Link href="/market">region</Link> or{" "}
              <Link href="/city">city</Link>.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Live</h3>
            <p className="faq-item__a">
              Queried directly from Companies House at the moment you look, so you see the record as it stands — not a
              private copy that drifts out of date.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Fresh</h3>
            <p className="faq-item__a">
              New incorporations are classified and searchable within 24 hours of appearing on the register. Watch them
              as they form on the <Link href="/signals">signals</Link> pages.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Sourced</h3>
            <p className="faq-item__a">
              Every figure is dated and traceable to a filing or an official release. See how each is computed in our{" "}
              <Link href="/sources">sources &amp; methodology</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <span className="eyebrow">Where it comes from</span>
          <h2 className="section__title">Public record, reused responsibly.</h2>
        </div>
        <div className="prose" style={{ paddingTop: 0 }}>
          <p>
            The core of CompaniesIQ is the Companies House register — Crown copyright, reused under the{" "}
            <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noreferrer">
              Open Government Licence v3.0
            </a>
            . Regional economic context — labour-market and business-population indicators — comes from the ONS and
            Nomis. We don&apos;t fabricate figures: anything beyond the register sits in a clearly-labelled enrichment
            layer, and where a value can&apos;t be measured it&apos;s marked &ldquo;Not Assessed&rdquo; rather than
            guessed. The full list of sources, each one&apos;s status and what it powers is on the{" "}
            <Link href="/sources">sources &amp; methodology</Link> page.
          </p>
        </div>
      </section>

      <section className="faq">
        <div className="section__head">
          <span className="eyebrow">FAQ</span>
          <h2 className="section__title">Questions about the data.</h2>
        </div>
        <div className="faq-grid">
          {FAQS.map(([q, a]) => (
            <div className="faq-item" key={q}>
              <h3 className="faq-item__q">{q}</h3>
              <p className="faq-item__a">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta ciq-dark">
        <div className="cta__inner">
          <h2 className="cta__title">Put the UK register to work.</h2>
          <p className="cta__sub">Search 5.5M companies free. Upgrade to track, alert and export the data that matters.</p>
          <div className="cta__actions">
            <Button href="/sign-in" variant="primary" size="lg" iconRight="arrowRight">
              Start free
            </Button>
            <Button href="/pricing" variant="ghost" size="lg">
              See pricing
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
