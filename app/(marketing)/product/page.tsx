import Link from "next/link";
import type { Metadata } from "next";
import { Button, Card, CardBody, Icon, type IconName } from "@/components/ds";
import { SiteFooter } from "@/components/marketing/Footer";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Product — UK company & new-formation intelligence",
  description:
    "CompaniesIQ turns the Companies House register into usable intelligence: search 5.5M UK companies, read full company reports, track new formations, and get real-time alerts. See how the product works.",
  alternates: { canonical: "/product" },
  openGraph: {
    title: "CompaniesIQ Product — UK company intelligence",
    description:
      "Search 5.5M UK companies, read full reports, track new formations and get real-time alerts — built on live Companies House data.",
    url: `${SITE_URL}/product`,
    type: "website",
  },
};

// Capabilities — each a real feature of the product, with a route it links to
// so the page also builds the internal-link graph (topical authority / GEO).
const CAPABILITIES: { icon: IconName; title: string; body: string; href: string; cta: string }[] = [
  {
    icon: "bell",
    title: "New companies, the day they appear",
    body: "Every UK incorporation is classified and searchable within 24 hours of hitting the register. Filter the fresh intake by sector, region and size to find the businesses that matter before anyone else does.",
    href: "/signals",
    cta: "See what's forming",
  },
  {
    icon: "search",
    title: "Search that understands business",
    body: "Query 5.5M companies by sector, region, size, age and status in plain language — not raw SIC-code soup. Turn a vague idea of a market into an exact, exportable list.",
    href: "/industry",
    cta: "Browse by industry",
  },
  {
    icon: "building",
    title: "Every company, in full",
    body: "Officers, persons with significant control, charges, accounts and a decade of filing history — assembled into one readable intelligence report instead of a dozen register pages.",
    href: "/sources",
    cta: "What's in a report",
  },
  {
    icon: "barChart",
    title: "Markets, not just records",
    body: "Roll millions of filings up into sector, regional and city trends to size a market or spot what's forming — the view the register itself never gives you.",
    href: "/market",
    cta: "Explore markets",
  },
  {
    icon: "trendUp",
    title: "Signals worth acting on",
    body: "Track a watchlist and get told the moment a company forms, files, appoints an officer, dissolves or raises a charge. The register does the watching so you don't have to.",
    href: "/free-alerts",
    cta: "Get free alerts",
  },
  {
    icon: "download",
    title: "Yours to take with you",
    body: "Export any search, report or list to CSV, or pull it through the API — every figure sourced from the public register and dated, so it drops straight into your CRM or model.",
    href: "/pricing",
    cta: "See plans & API",
  },
];

const STEPS: [string, string, string][] = [
  ["01", "Search", "Start with a sector, a region, or a fresh batch of new incorporations, then narrow with filters until the set is exactly right."],
  ["02", "Track", "Save the companies and markets that matter to a watchlist and let CompaniesIQ watch the register for you."],
  ["03", "Act", "Get alerted to every new formation and change, export the evidence, and reach them before the market does."],
];

const USE_CASES: { icon: IconName; who: string; body: string; href: string }[] = [
  { icon: "briefcase", who: "Agencies & sales teams", body: "Find newly registered businesses and pitch them before competitors know they exist.", href: "/signals" },
  { icon: "trendUp", who: "Investors & analysts", body: "Track emerging sectors and regional growth as it forms — not months later in a report.", href: "/market" },
  { icon: "users", who: "Recruiters", body: "Spot fast-growing employers the moment they scale and start hiring.", href: "/industry" },
  { icon: "file", who: "Accountants", body: "Reach newly incorporated companies that need accounting and compliance support.", href: "/city" },
];

const FAQS: [string, string][] = [
  [
    "What does CompaniesIQ do?",
    "CompaniesIQ is a UK company intelligence platform. It takes the full Companies House register — 5.5 million companies plus their officers, filings and charges — and makes it searchable, comparable and trackable: search by real business criteria, read a full report on any company, monitor new formations, and receive alerts when the register changes.",
  ],
  [
    "How is it different from Companies House?",
    "Companies House is the official, free source, but it is built for looking up one company at a time — no bulk filtering, no market roll-ups and no change alerts. CompaniesIQ adds the layer on top: search across the whole register at once, aggregate filings into sector and regional trends, and get notified the moment something changes.",
  ],
  [
    "Where does the data come from?",
    "Every company figure is pulled live from Companies House under the Open Government Licence, complemented by ONS and Nomis for regional economic context. Nothing is fabricated, and each figure is dated and sourced. The full methodology is on our sources & methodology page.",
  ],
  [
    "How fresh is the data?",
    "Company and register data is queried live from Companies House, and new incorporations are classified and searchable within 24 hours of appearing on the register. You see the record as it stands, not a stale private copy.",
  ],
  [
    "Can I export the data or use an API?",
    "Yes. Any search, report or list exports to CSV, and Pro plans include API access so you can pull companies and signals straight into your CRM, spreadsheet or model. See the pricing page for limits by plan.",
  ],
  [
    "Is there a free plan?",
    "Yes — you can search all 5.5M companies, view public profiles and read one full intelligence report a month for free, with no card required. Upgrade to Pro when you need unlimited reports, real-time alerts, watchlists and export.",
  ],
];

const BREADCRUMB = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
    { "@type": "ListItem", position: 2, name: "Product", item: `${SITE_URL}/product` },
  ],
};

const WEBPAGE = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Product — CompaniesIQ",
  url: `${SITE_URL}/product`,
  description:
    "How CompaniesIQ turns the Companies House register into usable UK company and new-formation intelligence: search, reports, market trends, alerts and export.",
  isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  primaryImageOfPage: `${SITE_URL}/logo/ciq-mark.svg`,
};

const SOFTWARE = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: `${SITE_URL}/product`,
  description:
    "UK company intelligence platform built on Companies House data — search 5.5M companies, read full reports, track new formations and get real-time alerts.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "GBP",
    description: "Free plan — search, public profiles and one full report a month, no card required.",
    url: `${SITE_URL}/pricing`,
  },
};

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(([q, a]) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function ProductPage() {
  return (
    <main className="site">
      <JsonLd data={[WEBPAGE, SOFTWARE, BREADCRUMB, FAQ_SCHEMA]} />

      <section className="pricing-hero">
        <span className="eyebrow">Product</span>
        <h1 className="pricing-hero__title">The UK register, made usable.</h1>
        <p className="pricing-hero__sub">
          CompaniesIQ turns Companies House into intelligence you can act on — search 5.5M companies, read a full report
          on any of them, track new formations, and get alerted the moment the register changes.
        </p>
        <div className="hero__actions" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/sign-in">
            <Button variant="primary" size="lg" iconRight="arrowRight">
              Start free
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
          <span className="eyebrow">What you can do</span>
          <h2 className="section__title">New-formation intelligence, not just a search box.</h2>
        </div>
        <div className="feat-grid">
          {CAPABILITIES.map((c) => (
            <div className="feat" key={c.title}>
              <span className="feat__icon">
                <Icon name={c.icon} size={20} />
              </span>
              <h3 className="feat__title">{c.title}</h3>
              <p className="feat__body">{c.body}</p>
              <Link href={c.href} className="feat__link">
                {c.cta} <Icon name="arrowRight" size={14} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--alt">
        <div className="section__head">
          <span className="eyebrow">How it works</span>
          <h2 className="section__title">From the register to a decision, in three steps.</h2>
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
          <span className="eyebrow">Who it's for</span>
          <h2 className="section__title">Built for whoever needs to move first.</h2>
        </div>
        <div className="use-grid">
          {USE_CASES.map((u) => (
            <Link key={u.who} href={u.href} style={{ textDecoration: "none" }}>
              <Card variant="flat">
                <CardBody>
                  <span className="feat__icon">
                    <Icon name={u.icon} size={20} />
                  </span>
                  <h3 className="feat__title">{u.who}</h3>
                  <p className="feat__body">{u.body}</p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="section section--alt">
        <div className="section__head">
          <span className="eyebrow">The data underneath</span>
          <h2 className="section__title">Real records, sourced and dated.</h2>
        </div>
        <div className="prose" style={{ paddingTop: 0 }}>
          <p>
            Every figure comes from the public record — the Companies House register under the Open Government Licence,
            with ONS and Nomis for regional economic context. We never fabricate numbers, and each one is dated so you
            can trace it. See exactly what powers the platform on our{" "}
            <Link href="/data">data &amp; coverage</Link> page, or read how every figure is computed in our{" "}
            <Link href="/sources">sources &amp; methodology</Link>.
          </p>
        </div>
      </section>

      <section className="faq">
        <div className="section__head">
          <span className="eyebrow">FAQ</span>
          <h2 className="section__title">Questions about the product.</h2>
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
          <h2 className="cta__title">See new UK businesses before everyone else.</h2>
          <p className="cta__sub">Free to search. No card required. Upgrade when you&apos;re ready to track, alert and export.</p>
          <div className="cta__actions">
            <Link href="/sign-in">
              <Button variant="primary" size="lg" iconRight="arrowRight">
                Start free
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
