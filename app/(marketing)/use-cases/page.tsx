import Link from "next/link";
import type { Metadata } from "next";
import { Button, Icon } from "@/components/ds";
import { SiteFooter } from "@/components/marketing/Footer";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd, webPageLd } from "@/lib/seo-schema";
import { USE_CASES } from "@/lib/use-cases";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const PATH = "/use-cases";

export const metadata: Metadata = {
  title: "Use cases — UK company intelligence for your profession",
  description:
    "How accountants, recruiters, agencies, sales teams, investors and brokers use CompaniesIQ to find newly registered companies, build prospect lists and act on new-formation signals.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "CompaniesIQ use cases — by profession",
    description:
      "Find newly registered companies and build targeted prospect lists — for accountants, recruiters, agencies, sales teams, investors and brokers.",
    url: `${SITE_URL}${PATH}`,
    type: "website",
  },
};

const ITEMLIST = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "CompaniesIQ use cases",
  itemListElement: USE_CASES.map((u, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: u.cardTitle,
    url: `${SITE_URL}${PATH}/${u.slug}`,
  })),
};

export default function UseCasesIndexPage() {
  return (
    <main className="site">
      <JsonLd
        data={[
          webPageLd({
            name: "Use cases — CompaniesIQ",
            path: PATH,
            description:
              "How each profession uses CompaniesIQ to find newly registered companies, build prospect lists and act on new-formation signals.",
          }),
          ITEMLIST,
          breadcrumbLd([
            ["Home", "/"],
            ["Use cases", PATH],
          ]),
        ]}
      />

      <section className="pricing-hero">
        <span className="eyebrow">Use cases</span>
        <h1 className="pricing-hero__title">The register, put to work for your job.</h1>
        <p className="pricing-hero__sub">
          The same live UK company data solves a different problem for every profession. Find newly registered companies,
          build targeted prospect lists, and act on new-formation signals — here&apos;s how each team does it.
        </p>
        <div className="hero__actions" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 22 }}>
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
          <span className="eyebrow">By profession</span>
          <h2 className="section__title">Find your use case.</h2>
        </div>
        <div className="feat-grid">
          {USE_CASES.map((u) => (
            <Link key={u.slug} href={`${PATH}/${u.slug}`} className="feat" style={{ textDecoration: "none" }}>
              <span className="feat__icon">
                <Icon name={u.cardIcon} size={20} />
              </span>
              <h3 className="feat__title">{u.cardTitle}</h3>
              <p className="feat__body">{u.cardBody}</p>
              <span className="feat__link">
                See how <Icon name="arrowRight" size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="cta ciq-dark">
        <div className="cta__inner">
          <h2 className="cta__title">Put the UK register to work.</h2>
          <p className="cta__sub">Search 5.5M companies free. Upgrade to build, track and export the data your job needs.</p>
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
