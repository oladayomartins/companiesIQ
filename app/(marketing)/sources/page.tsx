import Link from "next/link";
import { Badge } from "@/components/ds";
import { SiteFooter } from "@/components/marketing/Footer";
import { SOURCES, LIVE_SOURCES, REFERENCE_SOURCES } from "@/lib/sources";

export const metadata = {
  title: "Sources & methodology",
  description: "Every figure in CompaniesIQ is real and sourced. This page lists every data source, how each figure is computed, whether it is pulled live, and its licence.",
  alternates: { canonical: "/sources" },
};

// Bump when the methodology is revised.
const LAST_REVIEWED = "11 August 2026";

export default function SourcesPage() {
  return (
    <main className="site" id="main-content" tabIndex={-1}>
      <section className="pricing-hero">
        <span className="eyebrow">Methodology · Last reviewed {LAST_REVIEWED}</span>
        <h1 className="pricing-hero__title">Sources &amp; methodology.</h1>
        <p className="pricing-hero__sub">
          Nothing here asks for your trust. Every figure is computed from public records, and this page shows the
          working — the source, whether it&apos;s pulled live, and how it&apos;s calculated. If a number can&apos;t be
          traced to a Companies House filing, an ONS release, or a computation described below, we don&apos;t publish it.
        </p>
        <div className="bill-toggle" style={{ gap: 10, flexWrap: "wrap" }}>
          <Badge tone="pos" dot>
            {LIVE_SOURCES.length} live sources
          </Badge>
          <Badge tone="neutral">{REFERENCE_SOURCES.length} reference baselines</Badge>
          <Badge tone="neutral">Full UK register · live</Badge>
        </div>
        <p className="pricing-hero__sub" style={{ marginTop: 14, fontSize: 14 }}>
          CompaniesIQ covers the entire UK register — every company, officer, person with significant control (PSC),
          filing and charge — queried <strong>live</strong> from Companies House. We don&apos;t hold a private copy that
          drifts out of date; the record you see is the record as it stands.
        </p>
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

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section__head">
          <span className="eyebrow">How to read it</span>
          <h2 className="section__title">Live vs. reference.</h2>
        </div>
        <div className="faq-grid">
          <div className="faq-item">
            <h3 className="faq-item__q">Live API</h3>
            <p className="faq-item__a">
              Fetched in real time from a public API and cached briefly. Companies House powers all company and register
              data; Nomis/ONS powers regional labour-market indicators. These reflect the latest published period.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Reference baseline</h3>
            <p className="faq-item__a">
              Drawn from official ONS annual releases with no queryable API (business-survival rates; sector population
              totals). Used as indicative baselines and always labelled as such — we don&apos;t recompute them from a
              different data universe and present the result as official.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Derived figures</h3>
            <p className="faq-item__a">
              A few report figures (e.g. local market density) are transparently derived by combining live register data
              with a reference baseline. These are marked &ldquo;derived&rdquo; wherever they appear.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--alt" style={{ paddingTop: 0 }}>
        <div className="section__head">
          <span className="eyebrow">Show the working</span>
          <h2 className="section__title">How the figures are computed.</h2>
        </div>
        <div className="faq-grid">
          <div className="faq-item">
            <h3 className="faq-item__q">The &ldquo;as of&rdquo; date</h3>
            <p className="faq-item__a">
              Companies House publishes new incorporations a few days in arrears, so a window ending today would read
              partly empty. We find the most recent date that actually has published incorporations and anchor every
              live window to it — that&apos;s the &ldquo;as of&rdquo; date on the dashboard. Recomputed hourly.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Active companies</h3>
            <p className="faq-item__a">
              A live count of companies whose register status is <em>active</em>, straight from the Companies House
              search API — not a stored figure.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">New companies (window)</h3>
            <p className="faq-item__a">
              The count of companies incorporated between the window&apos;s start and the &ldquo;as of&rdquo; anchor —
              e.g. the last 30 days. We count the same-length preceding window too, so the period-over-period change is a
              real comparison, not an estimate.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Dissolved &amp; net new</h3>
            <p className="faq-item__a">
              Dissolutions are counted the same way over the window; <em>net new</em> is simply new incorporations minus
              dissolutions across that period.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Fastest-growing sector &amp; region</h3>
            <p className="faq-item__a">
              Recent incorporations are classified by their SIC codes into sectors and by registered office into UK
              regions, then ranked by formation activity. These are &ldquo;fastest-forming&rdquo; from live register
              data — not a market-share, revenue or growth-rate claim about the wider economy.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Formation trend</h3>
            <p className="faq-item__a">
              Real Companies House counts, one per time bucket — daily, weekly or monthly depending on the range you
              pick. Cached for an hour, so warm page loads cost zero API calls and everyone sees the same numbers.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Point-in-time</h3>
            <p className="faq-item__a">
              Live figures are snapshots cached briefly. The register changes continuously, so an exact count can move
              between page loads. Where a figure is dated, that date is the computation date.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Enrichment (fenced)</h3>
            <p className="faq-item__a">
              Anything beyond the register — e.g. a company&apos;s digital presence — is a separate, clearly-labelled
              enrichment layer. Each value is a measured fact with its source, or marked &ldquo;Not Assessed&rdquo;. We
              never guess a value and present it as fact.
            </p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section__head">
          <span className="eyebrow">Reading the data responsibly</span>
          <h2 className="section__title">Signals, not verdicts.</h2>
        </div>
        <div className="faq-grid">
          <div className="faq-item">
            <h3 className="faq-item__q">What this is</h3>
            <p className="faq-item__a">
              Everything we surface — new formations, sector and regional trends, growth signals — is an indicator drawn
              from public records to help you decide where to look, not a finding about any company or person, a credit
              decision, or professional advice.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Licence</h3>
            <p className="faq-item__a">
              All underlying data is © Crown copyright, reused under the Open Government Licence v3.0. Attribution shows
              on every report and in the footer.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Corrections</h3>
            <p className="faq-item__a">
              Think a figure is wrong, or a record about your company is inaccurate?{" "}
              <Link href="/contact">Tell us</Link> and we&apos;ll review it. Register-sourced errors can also be
              corrected at the source, directly with{" "}
              <a href="https://www.gov.uk/government/organisations/companies-house" target="_blank" rel="noreferrer">
                Companies House
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
