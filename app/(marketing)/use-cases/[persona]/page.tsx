import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Button, Icon } from "@/components/ds";
import { SiteFooter } from "@/components/marketing/Footer";
import { JsonLd } from "@/components/JsonLd";
import { fmtNumber } from "@/lib/format";
import { getRegisterKpis } from "@/lib/live-stats";
import { breadcrumbLd, webPageLd, faqLd } from "@/lib/seo-schema";
import { getUseCase, USE_CASES } from "@/lib/use-cases";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

export function generateStaticParams() {
  return USE_CASES.map((u) => ({ persona: u.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ persona: string }> }): Promise<Metadata> {
  const { persona } = await params;
  const uc = getUseCase(persona);
  if (!uc) return {};
  const path = `/use-cases/${uc.slug}`;
  return {
    title: uc.metaTitle,
    description: uc.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      title: uc.metaTitle,
      description: uc.metaDescription,
      url: `${SITE_URL}${path}`,
      type: "website",
    },
  };
}

export default async function UseCasePage({ params }: { params: Promise<{ persona: string }> }) {
  const { persona } = await params;
  const uc = getUseCase(persona);
  if (!uc) notFound();

  const path = `/use-cases/${uc.slug}`;
  const kpis = await getRegisterKpis(30).catch(() => null);

  const SERVICE = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `CompaniesIQ ${uc.forLabel.toLowerCase()}`,
    serviceType: "UK company intelligence and lead generation",
    provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    areaServed: { "@type": "Country", name: "United Kingdom" },
    audience: { "@type": "Audience", audienceType: uc.persona },
    url: `${SITE_URL}${path}`,
    description: uc.metaDescription,
  };

  return (
    <main className="site" id="main-content" tabIndex={-1}>
      <JsonLd
        data={[
          webPageLd({ name: `${uc.metaTitle} — CompaniesIQ`, path, description: uc.metaDescription }),
          SERVICE,
          breadcrumbLd([
            ["Home", "/"],
            ["Use cases", "/use-cases"],
            [uc.persona, path],
          ]),
          faqLd(uc.faqs),
        ]}
      />

      <section className="pricing-hero">
        <span className="eyebrow">{uc.forLabel}</span>
        <h1 className="pricing-hero__title">{uc.h1}</h1>
        <p className="pricing-hero__sub">{uc.intro}</p>
        <div className="bill-toggle" style={{ gap: 10, flexWrap: "wrap" }}>
          {kpis ? (
            <Badge tone="pos" dot>
              {fmtNumber(kpis.incorporations)} new companies in 30 days
            </Badge>
          ) : (
            <Badge tone="pos" dot>Thousands of new companies weekly</Badge>
          )}
          <Badge tone="neutral">Updated within 24h</Badge>
          <Badge tone="neutral">Filter by sector &amp; location</Badge>
          <Badge tone="neutral">Export to CSV</Badge>
        </div>
        <div className="hero__actions" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 26 }}>
          <Button href={uc.ctaHref} variant="primary" size="lg" iconRight="arrowRight">
            {uc.ctaLabel}
          </Button>
          <Button href="/pricing" variant="secondary" size="lg">
            See pricing
          </Button>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <span className="eyebrow">The job</span>
          <h2 className="section__title">{uc.jobTitle}</h2>
        </div>
        <div className="prose" style={{ paddingTop: 0 }}>
          <p>{uc.job}</p>
        </div>
      </section>

      <section className="section section--alt">
        <div className="section__head">
          <span className="eyebrow">How CompaniesIQ helps</span>
          <h2 className="section__title">What you get.</h2>
        </div>
        <div className="feat-grid">
          {uc.valueProps.map((v) => (
            <div className="feat" key={v.title}>
              <span className="feat__icon">
                <Icon name={v.icon} size={20} />
              </span>
              <h3 className="feat__title">{v.title}</h3>
              <p className="feat__body">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <span className="eyebrow">How it works</span>
          <h2 className="section__title">Three steps to a targeted list.</h2>
        </div>
        <div className="steps">
          {uc.steps.map(([n, t, b]) => (
            <div className="step" key={n}>
              <span className="step__n mono">{n}</span>
              <h3 className="step__t">{t}</h3>
              <p className="step__b">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--alt">
        <div className="section__head">
          <span className="eyebrow">Where to start</span>
          <h2 className="section__title">Point it at the right companies.</h2>
        </div>
        <div className="faq-grid">
          {uc.browse.map((b) => (
            <div className="faq-item" key={b.href + b.label}>
              <h3 className="faq-item__q">
                <Link href={b.href}>{b.label}</Link>
              </h3>
              <p className="faq-item__a">{b.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="faq">
        <div className="section__head">
          <span className="eyebrow">FAQ</span>
          <h2 className="section__title">Questions from {uc.persona.toLowerCase()}.</h2>
        </div>
        <div className="faq-grid">
          {uc.faqs.map(([q, a]) => (
            <div className="faq-item" key={q}>
              <h3 className="faq-item__q">{q}</h3>
              <p className="faq-item__a">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="prose" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "var(--text-ui)" }}>
            Explore more <Link href="/use-cases">use cases</Link>, or see the{" "}
            <Link href="/business-leads">business leads</Link> and{" "}
            <Link href="/company-database">company database</Link> pages.
          </p>
        </div>
      </section>

      <section className="cta ciq-dark">
        <div className="cta__inner">
          <h2 className="cta__title">{uc.ctaTitle}</h2>
          <p className="cta__sub">{uc.ctaSub}</p>
          <div className="cta__actions">
            <Button href={uc.ctaHref} variant="primary" size="lg" iconRight="arrowRight">
              {uc.ctaLabel}
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
