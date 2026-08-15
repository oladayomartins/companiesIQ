import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Button, Icon } from "@/components/ds";
import { SiteFooter } from "@/components/marketing/Footer";
import { JsonLd } from "@/components/JsonLd";
import { fmtNumber } from "@/lib/format";
import { getRegisterKpis } from "@/lib/live-stats";
import { breadcrumbLd, webPageLd, faqLd } from "@/lib/seo-schema";
import { getCompetitor, COMPETITORS } from "@/lib/competitors";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

export function generateStaticParams() {
  return COMPETITORS.map((c) => ({ competitor: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ competitor: string }> }): Promise<Metadata> {
  const { competitor } = await params;
  const c = getCompetitor(competitor);
  if (!c) return {};
  const path = `/alternatives/${c.slug}`;
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: { canonical: path },
    openGraph: { title: c.metaTitle, description: c.metaDescription, url: `${SITE_URL}${path}`, type: "website" },
  };
}

export default async function AlternativePage({ params }: { params: Promise<{ competitor: string }> }) {
  const { competitor } = await params;
  const c = getCompetitor(competitor);
  if (!c) notFound();

  const path = `/alternatives/${c.slug}`;
  const kpis = await getRegisterKpis(30).catch(() => null);

  return (
    <main className="site">
      <JsonLd
        data={[
          webPageLd({ name: `${c.metaTitle} — CompaniesIQ`, path, description: c.metaDescription }),
          breadcrumbLd([
            ["Home", "/"],
            ["Alternatives", "/alternatives"],
            [`${c.name} alternative`, path],
          ]),
          faqLd(c.faqs),
        ]}
      />

      <section className="pricing-hero">
        <span className="eyebrow">{c.name} alternative</span>
        <h1 className="pricing-hero__title">{c.h1}</h1>
        <p className="pricing-hero__sub">{c.intro}</p>
        <div className="bill-toggle" style={{ gap: 10, flexWrap: "wrap" }}>
          <Badge tone="pos" dot>
            {kpis ? `${fmtNumber(kpis.active)} live companies` : "5.5M live companies"}
          </Badge>
          <Badge tone="neutral">New companies within 24h</Badge>
          <Badge tone="neutral">Free to search</Badge>
        </div>
        <div className="hero__actions" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 26 }}>
          <Link href="/sign-in">
            <Button variant="primary" size="lg" iconRight="arrowRight">
              Try CompaniesIQ free
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
          <span className="eyebrow">What is {c.name}?</span>
          <h2 className="section__title">An honest look at {c.name}.</h2>
        </div>
        <div className="prose" style={{ paddingTop: 0 }}>
          <p>{c.whatTheyAre}</p>
          <p>
            <strong>Where {c.name} is strong:</strong>
          </p>
          <ul>
            {c.theirStrengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section--alt">
        <div className="section__head">
          <span className="eyebrow">Side by side</span>
          <h2 className="section__title">CompaniesIQ vs {c.name}.</h2>
        </div>
        <div className="vs-scroll">
          <table className="vs-table">
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col" className="vs-col-ciq">CompaniesIQ</th>
                <th scope="col">{c.name}</th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((r) => (
                <tr key={r.dimension}>
                  <td className="vs-feature">{r.dimension}</td>
                  <td className="vs-ciq vs-col-ciq">
                    {r.ciqWin ? <strong>{r.ciq}</strong> : r.ciq}
                  </td>
                  <td className="vs-them">{r.them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="prose" style={{ paddingTop: 16, fontSize: 12.5, textAlign: "center" }}>
          Comparison based on publicly available information about {c.name} (
          {c.sources.map((s, i) => (
            <span key={s.url}>
              {i > 0 ? ", " : ""}
              <a href={s.url} target="_blank" rel="nofollow noreferrer">
                {s.label}
              </a>
            </span>
          ))}
          ), as of {c.asOf}. Details may have changed since — verify current features and pricing with the provider.
          CompaniesIQ is our own product.
        </p>
      </section>

      <section className="section">
        <div className="section__head">
          <span className="eyebrow">Where CompaniesIQ is strongest</span>
          <h2 className="section__title">Built for new-company intelligence.</h2>
        </div>
        <div className="feat-grid">
          {c.ciqStrengths.map((v) => (
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

      <section className="section section--alt">
        <div className="section__head">
          <span className="eyebrow">Which should you choose?</span>
          <h2 className="section__title">Honest answer: it depends on the job.</h2>
        </div>
        <div className="faq-grid">
          <div className="faq-item">
            <h3 className="faq-item__q">Choose {c.name} if…</h3>
            <p className="faq-item__a">{c.chooseThem}</p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Choose CompaniesIQ if…</h3>
            <p className="faq-item__a">{c.chooseCiq}</p>
          </div>
        </div>
      </section>

      <section className="faq">
        <div className="section__head">
          <span className="eyebrow">FAQ</span>
          <h2 className="section__title">{c.name} alternative, answered.</h2>
        </div>
        <div className="faq-grid">
          {c.faqs.map(([q, a]) => (
            <div className="faq-item" key={q}>
              <h3 className="faq-item__q">{q}</h3>
              <p className="faq-item__a">{a}</p>
            </div>
          ))}
        </div>
        <p className="prose" style={{ paddingTop: 18, fontSize: 12, textAlign: "center" }}>
          Last updated {c.asOf}. See more <Link href="/alternatives">alternatives</Link>, or the{" "}
          <Link href="/companies-house-alternative">Companies House alternative</Link> page.
        </p>
      </section>

      <section className="cta ciq-dark">
        <div className="cta__inner">
          <h2 className="cta__title">See why teams pick CompaniesIQ.</h2>
          <p className="cta__sub">Search 5.5M UK companies free. Upgrade to track, alert and export the data that matters.</p>
          <div className="cta__actions">
            <Link href="/sign-in">
              <Button variant="primary" size="lg" iconRight="arrowRight">
                Try CompaniesIQ free
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
