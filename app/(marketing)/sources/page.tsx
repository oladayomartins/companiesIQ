import { Badge } from "@/components/ds";
import { SiteFooter } from "@/components/marketing/Footer";
import { SOURCES, LIVE_SOURCES, REFERENCE_SOURCES } from "@/lib/sources";

export const metadata = {
  title: "Sources & methodology · CompaniesIQ",
  description: "Every figure in CompaniesIQ is real and sourced. This page lists every data source, what it powers, whether it is pulled live, and its licence.",
};

export default function SourcesPage() {
  return (
    <main className="site">
      <section className="pricing-hero">
        <span className="eyebrow">Methodology</span>
        <h1 className="pricing-hero__title">Sources &amp; methodology.</h1>
        <p className="pricing-hero__sub">
          Every figure in CompaniesIQ is real and sourced. We pull live from public APIs where one exists, and use
          published official statistics as clearly-marked reference where one doesn&apos;t. Nothing is fabricated.
        </p>
        <div className="bill-toggle" style={{ gap: 10 }}>
          <Badge tone="pos" dot>
            {LIVE_SOURCES.length} live sources
          </Badge>
          <Badge tone="neutral">{REFERENCE_SOURCES.length} reference baselines</Badge>
        </div>
      </section>

      <section className="faq" style={{ paddingTop: 24 }}>
        <div className="src-table">
          <div className="src-row src-row--head">
            <span>Source</span>
            <span>Provider</span>
            <span>Status</span>
            <span>What it powers</span>
          </div>
          {SOURCES.map((s) => (
            <div className="src-row" key={s.id}>
              <span>
                <a className="src-name" href={s.url} target="_blank" rel="noreferrer">
                  {s.name}
                </a>
                <span className="src-licence mono">{s.licence}</span>
              </span>
              <span className="src-provider">{s.provider}</span>
              <span>
                {s.status === "live" ? (
                  <Badge tone="pos" dot>
                    Live API
                  </Badge>
                ) : (
                  <Badge tone="neutral">Reference</Badge>
                )}
              </span>
              <span className="src-powers">
                {s.powers}
                {s.note ? <span className="src-note">{s.note}</span> : null}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--alt" style={{ paddingTop: 0 }}>
        <div className="section__head">
          <span className="eyebrow">How to read it</span>
          <h2 className="section__title">Live vs. reference.</h2>
        </div>
        <div className="faq-grid">
          <div className="faq-item">
            <h3 className="faq-item__q">Live API</h3>
            <p className="faq-item__a">
              Fetched in real time from a public API and cached briefly. Companies House powers all company and
              register data; Nomis/ONS powers regional labour-market indicators. These reflect the latest published
              period.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Reference baseline</h3>
            <p className="faq-item__a">
              Drawn from official ONS annual releases that have no queryable API (Business Demography survival rates;
              Business Population Estimates sector totals). Used as indicative baselines and always labelled as such —
              we don&apos;t recompute them from a different data universe and present the result as official.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Derived figures</h3>
            <p className="faq-item__a">
              A few report figures (e.g. local market density) are transparently derived by combining live register
              data with reference baselines. These are marked &ldquo;derived&rdquo; wherever they appear.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Licence</h3>
            <p className="faq-item__a">
              All underlying data is © Crown copyright and reused under the Open Government Licence v3.0. Attribution is
              shown on every report and in the footer.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
