import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/Footer";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "About CompaniesIQ — UK company intelligence",
  description:
    "CompaniesIQ turns the UK public business register into market intelligence you can search, track and trust — built on Companies House, ONS and Nomis open data. Learn who we are and how we work.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About CompaniesIQ",
    description:
      "CompaniesIQ turns the UK's public business register into market intelligence anyone can search, track and trust.",
    url: `${SITE_URL}/about`,
    type: "website",
  },
};

const FAQS: [string, string][] = [
  [
    "What is CompaniesIQ?",
    "CompaniesIQ is a UK company intelligence platform. It takes the public Companies House register — around 5.5 million companies plus their officers, filings and charges — and makes it searchable, comparable and trackable, adding new-formation alerts and sector and regional market trends on top.",
  ],
  [
    "Who is CompaniesIQ for?",
    "Sales and agency teams finding newly registered businesses, investors and analysts tracking emerging sectors, recruiters spotting fast-growing employers, and accountants reaching newly incorporated companies — anyone who needs to understand a UK company, sector or region quickly.",
  ],
  [
    "Who runs CompaniesIQ?",
    "CompaniesIQ Ltd is registered in England & Wales (company number 14820317) and based in London.",
  ],
  [
    "Where does CompaniesIQ get its data?",
    "Live from Companies House, the ONS and Nomis. Everything is real and sourced, figures that come from a reference baseline are labelled as such, and we never fabricate numbers. The full detail is on our sources & methodology page.",
  ],
];

const BREADCRUMB = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
    { "@type": "ListItem", position: 2, name: "About", item: `${SITE_URL}/about` },
  ],
};

const ABOUT_PAGE = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About CompaniesIQ",
  url: `${SITE_URL}/about`,
  description:
    "CompaniesIQ turns the UK public business register into market intelligence you can search, track and trust — built on Companies House, ONS and Nomis open data.",
  mainEntity: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo/ciq-mark.svg`,
    foundingLocation: { "@type": "Place", name: "London, United Kingdom" },
    identifier: "14820317",
    areaServed: { "@type": "Country", name: "United Kingdom" },
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

export default function AboutPage() {
  return (
    <main className="site" id="main-content" tabIndex={-1}>
      <JsonLd data={[ABOUT_PAGE, BREADCRUMB, FAQ_SCHEMA]} />

      <section className="pricing-hero">
        <span className="eyebrow">About</span>
        <h1 className="pricing-hero__title">Know every UK company.</h1>
        <p className="pricing-hero__sub">
          CompaniesIQ turns the UK&apos;s public business register into market intelligence anyone can search, track and
          trust — around 5.5 million live companies, one source of truth.
        </p>
      </section>

      <section className="prose">
        <h2>What we do</h2>
        <p>
          Every company in the UK files with Companies House, but that data is hard to use. We classify, enrich and
          connect it with official economic statistics so founders, analysts and teams can understand a{" "}
          <Link href="/product">company, a sector or a region</Link> in seconds — not hours. See exactly what the{" "}
          <Link href="/product">product</Link> does and the <Link href="/data">data</Link> it&apos;s built on.
        </p>

        <h2>Where the data comes from</h2>
        <p>
          Everything is real and sourced. We pull live from Companies House, the ONS and Nomis, and clearly label any
          figure that comes from a published reference baseline. We never fabricate numbers. You can read exactly what
          powers each figure on our <Link href="/sources">sources &amp; methodology</Link> page.
        </p>

        <h2>What we believe</h2>
        <p>
          Public data should be genuinely usable, not locked behind one-record-at-a-time lookups or opaque scoring. So
          we show our working: every figure is dated and traceable, and anything we can&apos;t measure is marked
          &ldquo;Not Assessed&rdquo; rather than guessed. The signals we surface are indicators to help you decide where
          to look — not verdicts about any company or person.
        </p>

        <h2>Explore</h2>
        <p>
          Start with an <Link href="/industry">industry</Link>, a <Link href="/market">regional market</Link>, a{" "}
          <Link href="/city">city</Link>, or an emerging <Link href="/signals">signal</Link> — or read the{" "}
          <Link href="/blog">blog</Link>. See <Link href="/pricing">plans</Link> when you&apos;re ready for unlimited
          intelligence.
        </p>

        <h2>Who we are</h2>
        <p>
          CompaniesIQ Ltd is registered in England &amp; Wales (company no. 14820317), based in London. Building
          something with us or want to talk? <Link href="/contact">Get in touch</Link>.
        </p>
      </section>

      <section className="faq" style={{ paddingTop: 0 }}>
        <div className="section__head">
          <span className="eyebrow">FAQ</span>
          <h2 className="section__title">About CompaniesIQ.</h2>
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

      <SiteFooter />
    </main>
  );
}
