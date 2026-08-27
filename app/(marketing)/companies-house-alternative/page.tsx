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

const PATH = "/companies-house-alternative";

export const metadata: Metadata = {
  title: "Companies House Alternative — search, monitor & export UK companies",
  description:
    "A faster Companies House alternative: search all 5.5M UK companies at once, filter by sector, region and incorporation date, track new formations, get change alerts and export to CSV. Free to start.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "CompaniesIQ — a faster Companies House alternative",
    description:
      "Search 5.5M UK companies at once, filter by sector and location, track new formations and export results — everything the free register can't do.",
    url: `${SITE_URL}${PATH}`,
    type: "website",
  },
};

// Each limitation of the free register, paired with what CompaniesIQ does instead.
const GAPS: { icon: IconName; limit: string; fix: string }[] = [
  {
    icon: "search",
    limit: "One company at a time",
    fix: "Search the whole register at once — filter 5.5M companies by sector, region, size, age and status, and get an exact, exportable list instead of a single lookup.",
  },
  {
    icon: "bell",
    limit: "No new-formation feed",
    fix: "See every UK incorporation within 24 hours of it hitting the register, filtered to the sectors and locations you care about — the register has no way to show you what just formed.",
  },
  {
    icon: "alert",
    limit: "No change alerts",
    fix: "Follow companies on a watchlist and get told the moment one files accounts, appoints or loses a director, moves address, registers a charge or dissolves.",
  },
  {
    icon: "barChart",
    limit: "No market view",
    fix: "Roll millions of filings up into sector, region and city trends — formation rates, growth and survival — the aggregate picture the register never assembles.",
  },
  {
    icon: "building",
    limit: "Filings, not a report",
    fix: "Officers, PSCs, charges, accounts and a decade of filing history assembled into one readable company report, instead of a dozen separate register pages.",
  },
  {
    icon: "download",
    limit: "No bulk export or API",
    fix: "Export any search, report or list to CSV, or pull companies and signals through the API straight into your CRM, spreadsheet or model.",
  },
];

// Feature-by-feature contrast for the comparison table.
const COMPARISON: [string, string, string][] = [
  ["Search across the whole register", "One company or officer at a time", "Filter all 5.5M companies at once"],
  ["Filter by sector, region, size & age", "Not available", "Built in, combinable filters"],
  ["Newly incorporated companies feed", "Not available", "New formations within 24h, filtered"],
  ["Change & filing alerts", "Not available", "Watchlist alerts on any event"],
  ["Market & sector trends", "Not available", "Formation, growth & survival roll-ups"],
  ["Full company intelligence report", "Separate filing pages", "One assembled report per company"],
  ["CSV export & API", "Bulk data files only", "Export any view; API on Pro"],
  ["Price", "Free", "Free to search; Pro to track & export"],
];

const FAQS: [string, string][] = [
  [
    "What is the best Companies House alternative?",
    "It depends on the job. If you need to search across the whole UK register at once, watch new incorporations, get alerts when companies change, and export the results, CompaniesIQ is built for exactly that — it sits on top of the same official Companies House data but adds bulk search, filtering, new-formation feeds, monitoring and export that the free register doesn't offer.",
  ],
  [
    "Is CompaniesIQ a replacement for Companies House?",
    "No — it's a layer on top of it. Companies House remains the official, authoritative source, and every figure in CompaniesIQ is pulled live from it under the Open Government Licence. CompaniesIQ makes that same data searchable in bulk, trackable and exportable, so you use it as your working tool and Companies House as the system of record.",
  ],
  [
    "Why would I pay when Companies House is free?",
    "The register itself is free and always will be, but it's designed for looking up one company at a time. It can't search 5.5M companies by sector and region, show you what incorporated this week, alert you when a company files or changes, or export a list to your CRM. If you do any of those at scale, the time saved is the reason to use a tool built for it.",
  ],
  [
    "Is CompaniesIQ a good Companies House alternative for lead generation?",
    "Yes. Sales teams, agencies, accountants and recruiters use it to build prospect lists from the register — filter newly incorporated companies by sector and location, enrich them, and export to CSV. See the business leads and use-case pages for how each profession does it.",
  ],
  [
    "Where does the data come from?",
    "All company data is public record from Companies House, queried live and reused under the Open Government Licence v3.0, with ONS and Nomis added for regional economic context. Nothing is fabricated — every figure is dated and sourced, and where a value can't be measured it's marked 'Not Assessed'.",
  ],
  [
    "How fresh is the data compared to the register?",
    "It's the same live register data — CompaniesIQ queries Companies House directly rather than holding a stale private copy, so what you see reflects the register as it stands. New incorporations are classified and searchable within 24 hours of appearing.",
  ],
  [
    "Can I try it free?",
    "Yes. You can search all 5.5M companies and view public company profiles for free, with no card required. Upgrade to Analyst when you need full intelligence reports, 10-year filing history and CSV export.",
  ],
];

const SOFTWARE = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: `${SITE_URL}${PATH}`,
  description:
    "A Companies House alternative for searching, monitoring and exporting UK company data at scale — built on the live Companies House register.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "GBP",
    description: "Free plan — search the whole register and read a full report, no card required.",
    url: `${SITE_URL}/pricing`,
  },
};

export default async function CompaniesHouseAlternativePage() {
  const kpis = await getRegisterKpis(30).catch(() => null);

  return (
    <main className="site" id="main-content" tabIndex={-1}>
      <JsonLd
        data={[
          webPageLd({
            name: "Companies House Alternative — CompaniesIQ",
            path: PATH,
            description:
              "A faster Companies House alternative: bulk search, filtering, new-formation feeds, change alerts and CSV export on top of the live Companies House register.",
          }),
          SOFTWARE,
          breadcrumbLd([
            ["Home", "/"],
            ["Companies House alternative", PATH],
          ]),
          faqLd(FAQS),
        ]}
      />

      <section className="pricing-hero">
        <span className="eyebrow">Companies House alternative</span>
        <h1 className="pricing-hero__title">A faster way to search and monitor UK companies.</h1>
        <p className="pricing-hero__sub">
          The free Companies House register is built to look up one company at a time. CompaniesIQ sits on the same
          official data and adds what you actually need: search all {kpis ? fmtNumber(kpis.active) : "5.5M"} companies at
          once, filter by sector and location, track new formations, get change alerts and export the results.
        </p>
        <div className="bill-toggle" style={{ gap: 10, flexWrap: "wrap" }}>
          <Badge tone="pos" dot>
            {kpis ? `${fmtNumber(kpis.active)} live companies` : "5.5M live companies"}
          </Badge>
          {kpis ? <Badge tone="neutral">{fmtNumber(kpis.incorporations)} new in 30 days</Badge> : null}
          <Badge tone="neutral">Same live register data</Badge>
          <Badge tone="neutral">Search · Monitor · Export</Badge>
        </div>
        <div className="hero__actions" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 26 }}>
          <Button href="/sign-in" variant="primary" size="lg" iconRight="arrowRight">
            Try CompaniesIQ free
          </Button>
          <Button href="/search" variant="secondary" size="lg">
            Search companies
          </Button>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <span className="eyebrow">Where the free register stops</span>
          <h2 className="section__title">Everything Companies House can&apos;t do — in one place.</h2>
        </div>
        <div className="feat-grid">
          {GAPS.map((g) => (
            <div className="feat" key={g.limit}>
              <span className="feat__icon">
                <Icon name={g.icon} size={20} />
              </span>
              <h3 className="feat__title">{g.limit}</h3>
              <p className="feat__body">{g.fix}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--alt">
        <div className="section__head">
          <span className="eyebrow">Side by side</span>
          <h2 className="section__title">Companies House vs CompaniesIQ.</h2>
        </div>
        <div className="vs-scroll">
          <table className="vs-table">
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col">Companies House (free register)</th>
                <th scope="col" className="vs-col-ciq">CompaniesIQ</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([feature, them, ciq]) => (
                <tr key={feature}>
                  <td className="vs-feature">{feature}</td>
                  <td className="vs-them">{them}</td>
                  <td className="vs-ciq vs-col-ciq">{ciq}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="prose" style={{ paddingTop: 18, fontSize: 13, textAlign: "center" }}>
          Both use the same official Companies House register. CompaniesIQ reuses it under the Open Government Licence and
          adds the working layer on top.
        </p>
      </section>

      <section className="section">
        <div className="section__head">
          <span className="eyebrow">Explore the register</span>
          <h2 className="section__title">Start where the free search can&apos;t.</h2>
        </div>
        <div className="faq-grid">
          <div className="faq-item">
            <h3 className="faq-item__q">By industry</h3>
            <p className="faq-item__a">
              Browse and filter companies by sector — see counts, growth and survival for each. Start with{" "}
              <Link href="/industry">industries</Link>.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">By region &amp; city</h3>
            <p className="faq-item__a">
              Drill into UK <Link href="/market">regions</Link> and <Link href="/city">cities</Link> to find companies
              where you operate — something the register offers no way to do.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">What&apos;s forming now</h3>
            <p className="faq-item__a">
              Watch newly registered companies by theme on the <Link href="/signals">signals</Link> pages, updated as
              they appear on the register.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Monitor &amp; get alerts</h3>
            <p className="faq-item__a">
              Set up <Link href="/free-alerts">free alerts</Link> on new formations, or read more about{" "}
              <Link href="/company-monitoring">company monitoring</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="faq">
        <div className="section__head">
          <span className="eyebrow">FAQ</span>
          <h2 className="section__title">Companies House alternatives, answered.</h2>
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
          <h2 className="cta__title">The register, without the limits.</h2>
          <p className="cta__sub">Search 5.5M UK companies free. Upgrade to monitor, alert and export the data that matters.</p>
          <div className="cta__actions">
            <Button href="/sign-in" variant="primary" size="lg" iconRight="arrowRight">
              Try CompaniesIQ free
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
