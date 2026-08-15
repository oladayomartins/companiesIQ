import Link from "next/link";
import type { Metadata } from "next";
import { Badge, Button, Icon, type IconName } from "@/components/ds";
import { SiteFooter } from "@/components/marketing/Footer";
import { JsonLd } from "@/components/JsonLd";
import { fmtNumber } from "@/lib/format";
import { getRegisterKpis } from "@/lib/live-stats";
import { breadcrumbLd, webPageLd, faqLd } from "@/lib/seo-schema";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

const PATH = "/company-database";

export const metadata: Metadata = {
  title: "UK Company Database — search 5.5M companies by sector, region & date",
  description:
    "The UK company database built on the full Companies House register: search 5.5M businesses by industry, location, size, age and status, filter new formations, and export to CSV. Free to search.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "CompaniesIQ — the UK company database",
    description:
      "Search 5.5M UK companies by sector, region, size and incorporation date, filter new formations and export the results.",
    url: `${SITE_URL}${PATH}`,
    type: "website",
  },
};

const FIELDS: { icon: IconName; title: string; body: string }[] = [
  { icon: "building", title: "Every UK company", body: "Name, number, type, incorporation date, registered office, SIC activity codes and live status for all 5.5M companies on the register — plus dissolved history." },
  { icon: "users", title: "Officers & owners", body: "Current and resigned directors and secretaries, and persons with significant control — who runs and ultimately owns each company." },
  { icon: "file", title: "Filings & accounts", body: "Up to a decade of filing history per company, and — where filed in machine-readable form — net worth, turnover, cash and headcount." },
  { icon: "filter", title: "Real business filters", body: "Query by sector, region, city, company size, age and status in plain language, and combine filters until the list is exactly the market you want." },
  { icon: "bell", title: "New formations", body: "Every incorporation classified and searchable within 24 hours, so the database always includes the businesses that appeared this week." },
  { icon: "download", title: "Export & API", body: "Take any search or list out as CSV, or pull companies and signals through the API into your CRM, spreadsheet or model." },
];

const USE_GRID: { icon: IconName; who: string; body: string; href: string }[] = [
  { icon: "briefcase", who: "Sales & agencies", body: "Build targeted prospect lists from the register and reach businesses before competitors.", href: "/business-leads" },
  { icon: "barChart", who: "Analysts & investors", body: "Size markets and track sector and regional growth straight from live formation data.", href: "/market" },
  { icon: "search", who: "Researchers", body: "Look up any company's officers, owners, charges and filings in one assembled report.", href: "/industry" },
  { icon: "bell", who: "Monitoring", body: "Track companies and get alerted when the database record changes.", href: "/company-monitoring" },
];

const FAQS: [string, string][] = [
  [
    "What is a UK company database?",
    "A UK company database is a searchable copy of the company register — every UK business with its number, address, activity, officers and filings — that you can query in bulk. CompaniesIQ's database is built directly on the live Companies House register, so it covers all ~5.5 million active companies plus dissolved history, and stays current rather than drifting out of date.",
  ],
  [
    "How many companies are in the database?",
    "All of them. Because CompaniesIQ queries Companies House live rather than holding a fixed private copy, the count reflects the register as it stands — roughly 5.5 million active companies at any time, with millions more dissolved records searchable too.",
  ],
  [
    "Can I search the company database by industry and location?",
    "Yes. You can filter by SIC sector, UK region, city, company size, age and status, and combine those filters — for example newly incorporated construction companies in Manchester, or fintech firms in London. Every filtered view is exportable.",
  ],
  [
    "Is the company database free?",
    "You can search the whole database, view public company profiles and read a full intelligence report for free, with no card required. Paid plans add unlimited reports, saved lists, alerts, and CSV/API export limits — see the pricing page.",
  ],
  [
    "Can I export the data or connect it to my CRM?",
    "Yes. Any search, list or report exports to CSV, and Pro plans include API access so you can pull companies and signals straight into your CRM, spreadsheet or model. Every field is sourced from the public register and dated.",
  ],
  [
    "How is this different from downloading Companies House bulk data?",
    "Companies House offers bulk data files, but they're a raw snapshot with no search, filtering, enrichment or alerts — you'd have to build all of that yourself. CompaniesIQ gives you the same underlying data already searchable, filterable, enriched with sector and regional context, monitorable and exportable.",
  ],
];

const DATASET = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "UK company database — CompaniesIQ",
  description:
    "A searchable database of every UK company on the Companies House register — around 5.5 million active companies with officers, persons with significant control, charges, filing history and accounts, filterable by sector, region, size, age and status.",
  url: `${SITE_URL}${PATH}`,
  license: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
  creator: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  isBasedOn: "https://www.gov.uk/government/organisations/companies-house",
  spatialCoverage: { "@type": "Place", name: "United Kingdom" },
  keywords: ["UK company database", "UK business database", "Companies House", "company data", "SIC codes", "new company formations"],
  measurementTechnique: "Live Companies House REST API, with ONS and Nomis reference statistics",
};

export default async function CompanyDatabasePage() {
  const kpis = await getRegisterKpis(30).catch(() => null);

  return (
    <main className="site">
      <JsonLd
        data={[
          webPageLd({
            name: "UK Company Database — CompaniesIQ",
            path: PATH,
            description:
              "Search the full UK company database — 5.5M companies from Companies House, filterable by sector, region, size, age and status, with new formations and CSV export.",
          }),
          DATASET,
          breadcrumbLd([
            ["Home", "/"],
            ["UK company database", PATH],
          ]),
          faqLd(FAQS),
        ]}
      />

      <section className="pricing-hero">
        <span className="eyebrow">UK company database</span>
        <h1 className="pricing-hero__title">The whole UK register, in one searchable database.</h1>
        <p className="pricing-hero__sub">
          Search {kpis ? fmtNumber(kpis.active) : "5.5M"} UK companies by sector, region, size, age and status — filter
          the exact market you want, watch new formations appear, and export the results. Built on live Companies House
          data, updated within 24 hours.
        </p>
        <div className="bill-toggle" style={{ gap: 10, flexWrap: "wrap" }}>
          <Badge tone="pos" dot>
            {kpis ? `${fmtNumber(kpis.active)} live companies` : "5.5M live companies"}
          </Badge>
          <Badge tone="neutral">Full UK register</Badge>
          <Badge tone="neutral">Filter by sector &amp; location</Badge>
          <Badge tone="neutral">CSV &amp; API export</Badge>
        </div>
        <div className="hero__actions" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 26 }}>
          <Link href="/sign-in">
            <Button variant="primary" size="lg" iconRight="arrowRight">
              Search the database free
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="secondary" size="lg">
              See pricing
            </Button>
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <span className="eyebrow">What&apos;s in it</span>
          <h2 className="section__title">Not just names and numbers.</h2>
        </div>
        <div className="feat-grid">
          {FIELDS.map((f) => (
            <div className="feat" key={f.title}>
              <span className="feat__icon">
                <Icon name={f.icon} size={20} />
              </span>
              <h3 className="feat__title">{f.title}</h3>
              <p className="feat__body">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--alt">
        <div className="section__head">
          <span className="eyebrow">Browse the database</span>
          <h2 className="section__title">Every way in.</h2>
        </div>
        <div className="faq-grid">
          <div className="faq-item">
            <h3 className="faq-item__q">By industry</h3>
            <p className="faq-item__a">
              Explore companies by sector with formation, growth and survival figures — start with{" "}
              <Link href="/industry">industries</Link>.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">By region</h3>
            <p className="faq-item__a">
              Drill into UK <Link href="/market">regions</Link> and <Link href="/city">cities</Link> to find companies
              where you operate.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">By signal</h3>
            <p className="faq-item__a">
              Track what&apos;s forming now on the <Link href="/signals">signals</Link> pages, updated as companies hit
              the register.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">The data behind it</h3>
            <p className="faq-item__a">
              See coverage, freshness and sources on the <Link href="/data">data &amp; coverage</Link> page.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <span className="eyebrow">Who uses it</span>
          <h2 className="section__title">One database, many jobs.</h2>
        </div>
        <div className="faq-grid">
          {USE_GRID.map((u) => (
            <div className="faq-item" key={u.who}>
              <h3 className="faq-item__q">
                <span className="feat__icon" style={{ display: "inline-flex", marginRight: 8, verticalAlign: "middle" }}>
                  <Icon name={u.icon} size={16} />
                </span>
                {u.who}
              </h3>
              <p className="faq-item__a">
                {u.body} <Link href={u.href}>Learn more</Link>.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="faq">
        <div className="section__head">
          <span className="eyebrow">FAQ</span>
          <h2 className="section__title">About the UK company database.</h2>
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
          <h2 className="cta__title">Search the UK company database.</h2>
          <p className="cta__sub">Free to search all 5.5M companies. Upgrade to save, alert and export.</p>
          <div className="cta__actions">
            <Link href="/sign-in">
              <Button variant="primary" size="lg" iconRight="arrowRight">
                Search the database free
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="lg">
                See pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
