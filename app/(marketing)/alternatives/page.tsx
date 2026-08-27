import Link from "next/link";
import type { Metadata } from "next";
import { Button, Icon } from "@/components/ds";
import { SiteFooter } from "@/components/marketing/Footer";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd, webPageLd } from "@/lib/seo-schema";
import { COMPETITORS } from "@/lib/competitors";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const PATH = "/alternatives";

export const metadata: Metadata = {
  title: "CompaniesIQ Alternatives & Comparisons — UK company data tools",
  description:
    "How CompaniesIQ compares to other UK company-data and lead tools. Honest, sourced side-by-side comparisons for finding newly registered companies, market intelligence and monitoring.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "CompaniesIQ alternatives & comparisons",
    description: "Honest, sourced comparisons vs other UK company-data and lead tools.",
    url: `${SITE_URL}${PATH}`,
    type: "website",
  },
};

// Companies House alternative lives at its own top-level path; surface it here too.
const EXTRA = { slug: "../companies-house-alternative", name: "Companies House", href: "/companies-house-alternative" };

export default function AlternativesIndexPage() {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "CompaniesIQ comparisons",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Companies House alternative", url: `${SITE_URL}/companies-house-alternative` },
      ...COMPETITORS.map((c, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: `${c.name} alternative`,
        url: `${SITE_URL}${PATH}/${c.slug}`,
      })),
    ],
  };

  return (
    <main className="site" id="main-content" tabIndex={-1}>
      <JsonLd
        data={[
          webPageLd({
            name: "Alternatives & comparisons — CompaniesIQ",
            path: PATH,
            description: "Honest, sourced comparisons of CompaniesIQ vs other UK company-data and lead tools.",
          }),
          itemList,
          breadcrumbLd([
            ["Home", "/"],
            ["Alternatives", PATH],
          ]),
        ]}
      />

      <section className="pricing-hero">
        <span className="eyebrow">Comparisons</span>
        <h1 className="pricing-hero__title">How CompaniesIQ compares.</h1>
        <p className="pricing-hero__sub">
          Honest, sourced side-by-side comparisons with other UK company-data and lead tools — centred on what
          CompaniesIQ does best: finding newly registered companies, reading the market around them, and monitoring
          change on the live register.
        </p>
        <div className="hero__actions" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 22 }}>
          <Button href="/sign-in" variant="primary" size="lg" iconRight="arrowRight">
            Start free
          </Button>
          <Button href="/pricing" variant="secondary" size="lg">
            See pricing
          </Button>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <span className="eyebrow">Comparisons</span>
          <h2 className="section__title">Pick a comparison.</h2>
        </div>
        <div className="feat-grid">
          <Link href={EXTRA.href} className="feat" style={{ textDecoration: "none" }}>
            <span className="feat__icon">
              <Icon name="building" size={20} />
            </span>
            <h3 className="feat__title">CompaniesIQ vs {EXTRA.name}</h3>
            <p className="feat__body">The free register is one company at a time — see how CompaniesIQ adds bulk search, alerts and export.</p>
            <span className="feat__link">
              Compare <Icon name="arrowRight" size={14} />
            </span>
          </Link>
          {COMPETITORS.map((c) => (
            <Link key={c.slug} href={`${PATH}/${c.slug}`} className="feat" style={{ textDecoration: "none" }}>
              <span className="feat__icon">
                <Icon name="barChart" size={20} />
              </span>
              <h3 className="feat__title">CompaniesIQ vs {c.name}</h3>
              <p className="feat__body">{c.ogSub}</p>
              <span className="feat__link">
                Compare <Icon name="arrowRight" size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="cta ciq-dark">
        <div className="cta__inner">
          <h2 className="cta__title">Try it yourself, free.</h2>
          <p className="cta__sub">Search 5.5M UK companies free. Upgrade to track, alert and export.</p>
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
