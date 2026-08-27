import Link from "next/link";
import type { Metadata } from "next";
import { Badge, Button, Icon, type IconName } from "@/components/ds";
import { SiteFooter } from "@/components/marketing/Footer";
import { RelatedGuides } from "@/components/RelatedGuides";
import { guidesForMonitoring } from "@/lib/guides";
import { JsonLd } from "@/components/JsonLd";
import { fmtNumber } from "@/lib/format";
import { getRegisterKpis } from "@/lib/live-stats";
import { breadcrumbLd, webPageLd, faqLd } from "@/lib/seo-schema";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

const PATH = "/company-monitoring";

export const metadata: Metadata = {
  title: "Company Monitoring — Companies House alerts on directors, filings & changes",
  description:
    "Monitor UK companies and get alerted the moment they change: new directors, filed accounts, address changes, charges, dissolutions and new formations. Companies House monitoring on a watchlist. Free alerts to start.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "CompaniesIQ — company monitoring & Companies House alerts",
    description:
      "Track UK companies and get told the moment a director changes, accounts are filed, a charge is registered or a company dissolves.",
    url: `${SITE_URL}${PATH}`,
    type: "website",
  },
};

const EVENTS: { icon: IconName; title: string; body: string }[] = [
  { icon: "users", title: "Director & officer changes", body: "Get alerted when a company appoints or removes a director or secretary — a signal of growth, restructuring or risk, straight from the register." },
  { icon: "file", title: "Accounts & filings", body: "Know the moment accounts, confirmation statements or other documents are filed — including when accounts are overdue." },
  { icon: "pin", title: "Address & status changes", body: "Track registered-office moves and status changes, from active to dissolved, liquidation or administration." },
  { icon: "alert", title: "Charges registered", body: "See when a mortgage or charge is registered against a company — a signal of new borrowing or secured lending." },
  { icon: "bell", title: "New formations", body: "Monitor a sector, region or theme and be told as new companies incorporate into it, within 24 hours of the register." },
  { icon: "bookmark", title: "Watchlists", body: "Group the companies, competitors or prospects you care about into watchlists and monitor them all from one place." },
];

const STEPS: [string, string, string][] = [
  ["01", "Choose what to watch", "Add specific companies to a watchlist, or set a rule — a sector, region or theme — to monitor whole slices of the register."],
  ["02", "We watch the register", "CompaniesIQ checks Companies House for you and detects new formations, filings, officer changes, charges and dissolutions as they land."],
  ["03", "Get alerted & act", "Receive alerts the moment something changes, then open the full company report, export it, or reach out before the market notices."],
];

const FAQS: [string, string][] = [
  [
    "What is company monitoring?",
    "Company monitoring means tracking one or more UK companies for changes on the Companies House register — new directors, filed accounts, address changes, charges, status changes and dissolutions — and being alerted when they happen, instead of manually re-checking the register. CompaniesIQ does the watching and notifies you.",
  ],
  [
    "How do I get Companies House alerts?",
    "Add the companies you care about to a watchlist, or set a rule for a sector, region or theme, and CompaniesIQ alerts you whenever a monitored event occurs. You can start with free alerts on new formations and upgrade for full watchlist monitoring across all event types.",
  ],
  [
    "Can I get an alert when a company changes director?",
    "Yes. Director and officer appointments and removals are one of the core events monitored. When a company on your watchlist appoints or loses a director, you're alerted — useful for tracking competitors, prospects, portfolio companies or counterparties.",
  ],
  [
    "Can I monitor my competitors?",
    "Yes. Add competitors to a watchlist and you'll see when they file accounts, change directors, move address, register a charge or dissolve — the public signals of how a competitor is performing and changing, as they happen.",
  ],
  [
    "Can I monitor companies filing new accounts or with overdue accounts?",
    "Yes. Accounts filings are a monitored event, and the underlying data flags accounts that are due or overdue — so you can track when a company files, or surface companies whose accounts are late as a risk or outreach signal.",
  ],
  [
    "How fast are the alerts?",
    "CompaniesIQ tracks the live register and surfaces new formations and changes within about 24 hours of them appearing on Companies House, so you act on fresh information rather than discovering changes weeks later.",
  ],
  [
    "Is company monitoring free?",
    "You can set up free alerts on new company formations with no card required. Full watchlist monitoring across directors, filings, charges and status changes is part of the paid plans — see the pricing page for limits.",
  ],
];

const SERVICE = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Company monitoring — CompaniesIQ",
  serviceType: "Companies House monitoring and change alerts",
  provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  areaServed: { "@type": "Country", name: "United Kingdom" },
  url: `${SITE_URL}${PATH}`,
  description:
    "Monitor UK companies on the Companies House register and get alerted to director changes, filings, charges, address and status changes, and new formations.",
};

export default async function CompanyMonitoringPage() {
  const kpis = await getRegisterKpis(30).catch(() => null);

  return (
    <main className="site" id="main-content" tabIndex={-1}>
      <JsonLd
        data={[
          webPageLd({
            name: "Company Monitoring — CompaniesIQ",
            path: PATH,
            description:
              "Company monitoring and Companies House alerts on directors, filings, charges, address and status changes, and new formations — from a watchlist.",
          }),
          SERVICE,
          breadcrumbLd([
            ["Home", "/"],
            ["Company monitoring", PATH],
          ]),
          faqLd(FAQS),
        ]}
      />

      <section className="pricing-hero">
        <span className="eyebrow">Company monitoring</span>
        <h1 className="pricing-hero__title">Get told the moment a company changes.</h1>
        <p className="pricing-hero__sub">
          Stop re-checking Companies House by hand. Add companies to a watchlist and CompaniesIQ alerts you when a
          director changes, accounts are filed, a charge is registered, an address moves or a company dissolves — plus
          new formations as they appear.
        </p>
        <div className="bill-toggle" style={{ gap: 10, flexWrap: "wrap" }}>
          <Badge tone="pos" dot>Real-time change alerts</Badge>
          {kpis ? <Badge tone="neutral">{fmtNumber(kpis.incorporations)} new companies in 30 days</Badge> : null}
          <Badge tone="neutral">Directors · Filings · Charges</Badge>
          <Badge tone="neutral">Updated within 24h</Badge>
        </div>
        <div className="hero__actions" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 26 }}>
          <Button href="/free-alerts" variant="primary" size="lg" iconRight="arrowRight">
            Set up free alerts
          </Button>
          <Button href="/sign-in" variant="secondary" size="lg">
            Create a watchlist
          </Button>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <span className="eyebrow">What you can monitor</span>
          <h2 className="section__title">Every signal the register gives off.</h2>
        </div>
        <div className="feat-grid">
          {EVENTS.map((e) => (
            <div className="feat" key={e.title}>
              <span className="feat__icon">
                <Icon name={e.icon} size={20} />
              </span>
              <h3 className="feat__title">{e.title}</h3>
              <p className="feat__body">{e.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--alt">
        <div className="section__head">
          <span className="eyebrow">How it works</span>
          <h2 className="section__title">Set it once, then get alerted.</h2>
        </div>
        <div className="steps">
          {STEPS.map(([n, t, b]) => (
            <div className="step" key={n}>
              <span className="step__n mono">{n}</span>
              <h3 className="step__t">{t}</h3>
              <p className="step__b">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <span className="eyebrow">Put it to work</span>
          <h2 className="section__title">Monitor what matters to you.</h2>
        </div>
        <div className="faq-grid">
          <div className="faq-item">
            <h3 className="faq-item__q">Competitor tracking</h3>
            <p className="faq-item__a">
              Watch competitors for filings, hires and structural changes as they happen — see it first on the{" "}
              <Link href="/signals">signals</Link> pages.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Prospect &amp; client monitoring</h3>
            <p className="faq-item__a">
              Track prospects and clients so you know the moment something changes — pair it with{" "}
              <Link href="/business-leads">business leads</Link>.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">New-formation watch</h3>
            <p className="faq-item__a">
              Monitor a whole sector or region for new incorporations — browse <Link href="/industry">industries</Link>{" "}
              and <Link href="/market">regions</Link> to scope it.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Risk &amp; counterparty checks</h3>
            <p className="faq-item__a">
              Get alerted to overdue accounts, charges and status changes on the companies you do business with. See the{" "}
              <Link href="/data">data</Link> behind each signal.
            </p>
          </div>
        </div>
      </section>

      <section className="faq">
        <div className="section__head">
          <span className="eyebrow">FAQ</span>
          <h2 className="section__title">Company monitoring, answered.</h2>
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

      <section className="section">
        <RelatedGuides guides={guidesForMonitoring()} title="Learn the basics" />
      </section>

      <section className="cta ciq-dark">
        <div className="cta__inner">
          <h2 className="cta__title">Let the register do the watching.</h2>
          <p className="cta__sub">Start with free new-formation alerts. Upgrade to monitor directors, filings and changes on a watchlist.</p>
          <div className="cta__actions">
            <Button href="/free-alerts" variant="primary" size="lg" iconRight="arrowRight">
              Set up free alerts
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
