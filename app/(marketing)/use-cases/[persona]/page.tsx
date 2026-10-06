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
import { getMarketSummary } from "@/lib/market-summary";
import { LeadListBuilder } from "@/components/marketing/LeadListBuilder";
import { FreeAlertForm } from "@/components/FreeAlertForm";

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
    // "· CompaniesIQ" is appended by the layout; long titles drop it so the
    // useful part isn't cut off in search results.
    title: uc.metaTitle.length > 46 ? { absolute: uc.metaTitle } : uc.metaTitle,
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
  const [kpis, focus] = await Promise.all([
    getRegisterKpis(30).catch(() => null),
    // Live counts for the sectors this audience sells into (cached 6h each).
    Promise.all((uc.sectorFocus ?? []).map(async (f) => ({ ...f, m: await getMarketSummary({ sector: f.sector }) }))),
  ]);
  // Every use case now has a lead-list builder on the page, so the primary CTA
  // starts a list there instead of sending people to sign in first.
  const primaryHref = "#build";

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
          <Button href={primaryHref} variant="primary" size="lg" iconRight="arrowRight">
            {uc.ctaLabel}
          </Button>
          <Button href="#weekly" variant="secondary" size="lg">
            Get new leads weekly — free
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

      {focus.length ? (
        <section className="section section--alt">
          <div className="section__head">
            <span className="eyebrow">Live on the register</span>
            <h2 className="section__title">Where the demand is this month.</h2>
          </div>
          <div className="lead-sectors">
            {focus.map(({ sector, need, m }) => (
              <div className="lead-sector" key={sector}>
                <h3 className="lead-sector__name">{sector}</h3>
                {m ? (
                  <p className="lead-sector__stats">
                    <strong>{fmtNumber(m.new30)}</strong> new in the last 30 days
                    <span className="lead-sector__sub mono">{fmtNumber(m.active)} active UK companies</span>
                  </p>
                ) : null}
                <p className="feat__body" style={{ margin: 0 }}>
                  {need}
                </p>
                <Link className="lead-sector__cta" href={`/search?q=${encodeURIComponent(`new ${sector} companies`)}`}>
                  See the newest {sector.toLowerCase()} businesses →
                </Link>
              </div>
            ))}
          </div>
          <p className="lead-builder__note mono">
            Counts are Companies House totals for the SIC codes CompaniesIQ tracks in each industry.
          </p>
        </section>
      ) : null}

      <section className="section" id="build">
        <div className="section__head">
          <span className="eyebrow">Build a lead list</span>
          <h2 className="section__title">Pick a trade and a town. See every new company.</h2>
        </div>
        <LeadListBuilder defaultSector={uc.builderSector ?? "Construction"} />
        <p className="lead-builder__note mono">
          Live from Companies House · free to search, no card · upgrade to save, track and export the full list
        </p>
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

      <section className="section section--alt" id="weekly">
        <div className="section__head">
          <span className="eyebrow">Free weekly email</span>
          <h2 className="section__title">New businesses in your trades, every week.</h2>
        </div>
        <div className="fa-card" style={{ maxWidth: 560, margin: "0 auto" }}>
          <FreeAlertForm sector={uc.builderSector ?? ""} source={`use-case:${uc.slug}`} />
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
            <Button href={primaryHref} variant="primary" size="lg" iconRight="arrowRight">
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
