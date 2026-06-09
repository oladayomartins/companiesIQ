import Link from "next/link";
import { Card, CardHeader, CardBody, Stat, Badge, Icon } from "@/components/ds";
import type { IntelligenceReport as Report, SimilarCompany } from "@/lib/analytics";
import type { CompanyEnrichment } from "@/lib/enrichment/types";
import type { OpportunityIntel, DigitalFact } from "@/lib/opportunity";
import { fmtNumber, fmtPercent, fmtDelta, fmtDate } from "@/lib/format";

function Source({ children }: { children: React.ReactNode }) {
  return (
    <div className="source">
      <span className="source__dot">●</span> Source · {children}
    </div>
  );
}

function SectionHead({ n, title }: { n: number; title: string }) {
  return (
    <div className="rsec__head">
      <span className="rsec__n mono">{String(n).padStart(2, "0")}</span>
      <h3 className="rsec__title">{title}</h3>
    </div>
  );
}

const STARTUP_FOUNDATIONS = ["Business bank account", "Accounting system", "Professional email", "Website", "Insurance", "Record keeping"];

function ReadinessList({ items, status }: { items: string[]; status: string }) {
  return (
    <div className="readiness">
      {items.map((label) => (
        <div className="readiness__row" key={label}>
          <span className="readiness__label">{label}</span>
          <Badge tone="neutral">{status}</Badge>
        </div>
      ))}
    </div>
  );
}

// One digital-presence fact row — a confident, sourced statement. Detected →
// the value (a link where it is one); not detected → an explicit "Not detected";
// not assessed → "Not assessed" (we never guess).
function FactRow({ fact }: { fact: DigitalFact }) {
  const tone = fact.state === "detected" ? "pos" : fact.state === "not_detected" ? "warn" : "neutral";
  const text = fact.state === "detected" ? fact.value ?? "Detected" : fact.state === "not_detected" ? fact.value ?? "Not detected" : "Not assessed";
  return (
    <div className="readiness__row">
      <span className="readiness__label">{fact.label}</span>
      {fact.state === "detected" && fact.href ? (
        <a className="link-btn" href={fact.href} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      ) : (
        <Badge tone={tone}>{text}</Badge>
      )}
    </div>
  );
}

function OppRow({ tone, children }: { tone: "good" | "watch" | "neutral"; children: React.ReactNode }) {
  return (
    <div className={`opp-row opp-row--${tone}`}>
      <span className="opp-row__mark" aria-hidden="true">
        {tone === "good" ? "✓" : tone === "watch" ? "!" : "•"}
      </span>
      <span>{children}</span>
    </div>
  );
}

export function IntelligenceReport({
  report,
  similar = [],
  opportunity = null,
}: {
  report: Report;
  similar?: SimilarCompany[];
  // Accepted for call-site compatibility; the opportunity object already
  // encapsulates the enrichment-derived facts shown in the report.
  enrichment?: CompanyEnrichment | null;
  opportunity?: OpportunityIntel | null;
}) {
  const r = report;
  return (
    <div className="report">
      <p className="report__intro">
        A market briefing for {r.overview.name}, assembled from the public register and official economic data. Every
        figure below is sourced and dated — educational, not promotional.
      </p>

      {/* 1 · Opportunity intelligence — the lead-qualification view */}
      {opportunity ? (
        <Card>
          <CardHeader children={<SectionHead n={1} title="Opportunity intelligence" />} action={<Badge tone="accent">Lead view</Badge>} />
          <CardBody>
            <p className="rsec__note">
              A lead-qualification view of {r.overview.name}. Facts are verified from the public record and Google
              Places. Sector and provider notes are labelled as common patterns — not claims about this company.
            </p>

            {/* Score + headline signals */}
            <div className="opp-top">
              <div className="opp-score">
                <div className="opp-score__num">
                  {opportunity.score}
                  <span className="opp-score__den">/100</span>
                </div>
                <div className="opp-score__label">Opportunity signal score</div>
              </div>
              <div className="opp-signals">
                {opportunity.signals.length ? (
                  opportunity.signals.map((s, i) => (
                    <span key={i} className={`opp-chip opp-chip--${s.tone}`}>
                      {s.tone === "good" ? "✓" : s.tone === "watch" ? "⚠" : "•"} {s.label}
                      {s.detail ? ` · ${s.detail}` : ""}
                    </span>
                  ))
                ) : (
                  <span className="rsec__note">No notable signals on the public record.</span>
                )}
              </div>
            </div>

            {/* Digital presence — verified facts */}
            <div className="opp-block">
              <div className="opp-block__title">
                Digital presence
                <Badge tone={opportunity.digitalMeasured ? "pos" : "neutral"}>
                  {opportunity.digitalMeasured ? "Measured" : "Not assessed"}
                </Badge>
              </div>
              <div className="readiness">
                <FactRow fact={opportunity.digital.website} />
                <FactRow fact={opportunity.digital.gbp} />
                <FactRow fact={opportunity.digital.reviews} />
                <FactRow fact={opportunity.digital.phone} />
              </div>
              {opportunity.digitalMeasured ? (
                <Source>Google Places · public business listing</Source>
              ) : (
                <p className="rsec__note">Measured from Google Places when a confident match exists; otherwise shown as Not assessed (never assumed).</p>
              )}
            </div>

            {/* Compliance & register — verified facts */}
            <div className="opp-block">
              <div className="opp-block__title">Compliance &amp; register signals</div>
              <div className="opp-list">
                {opportunity.compliance.map((s, i) => (
                  <OppRow key={i} tone={s.tone}>
                    {s.label}
                    {s.detail ? ` — ${s.detail}` : ""}
                  </OppRow>
                ))}
              </div>
              <Source>Companies House · public filing record</Source>
            </div>

            {/* Category 2 — sector norms (clearly labelled) */}
            <div className="opp-cols">
              <div className="opp-block">
                <div className="opp-block__title">Likely relevant · sector norms</div>
                <p className="rsec__note">
                  Businesses in {opportunity.sector} commonly invest in the following. A general pattern for the sector —
                  not an assessment of this company&apos;s needs.
                </p>
                <div className="opp-tags">
                  {opportunity.commonlyInvests.map((x) => (
                    <span className="opp-tag" key={x}>{x}</span>
                  ))}
                </div>
              </div>
              <div className="opp-block">
                <div className="opp-block__title">Commonly relevant to</div>
                <p className="rsec__note">Provider types that typically serve a company with this profile.</p>
                <div className="opp-tags">
                  {opportunity.relevantFor.map((x) => (
                    <span className="opp-tag opp-tag--prov" key={x}>{x}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Transparent score basis */}
            {opportunity.scoreBasis.length ? (
              <details className="opp-basis">
                <summary>How this score is calculated</summary>
                <ul>
                  {opportunity.scoreBasis.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
                <p className="rsec__note">Composite of verified public signals only. Indicative — not a recommendation.</p>
              </details>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {/* 2 · Market summary */}
      <Card>
        <CardHeader children={<SectionHead n={2} title="Market summary" />} />
        <CardBody>
          <div className="metric-row metric-row--5">
            <Stat size="sm" label="Industry" value={r.overview.sector} />
            <Stat size="sm" label="Market size" value={fmtNumber(r.industry.businesses)} />
            <Stat size="sm" label="New registrations (12m)" value={fmtNumber(r.industry.newLastYear)} />
            <Stat size="sm" label="Growth rate" value={fmtDelta(r.industry.annualGrowth)} />
            <Stat size="sm" label="Survival rate (5yr)" value={fmtPercent(r.survival.fiveYear)} />
          </div>
          <Source>{r.industry.source}; {r.survival.source}</Source>
        </CardBody>
      </Card>

      {/* 3 · Business overview */}
      <Card>
        <CardHeader children={<SectionHead n={3} title="Business overview" />} />
        <CardBody>
          <dl className="detail-list">
            <div>
              <dt>Company</dt>
              <dd>{r.overview.name}</dd>
            </div>
            <div>
              <dt>Company number</dt>
              <dd className="mono">{r.overview.number}</dd>
            </div>
            <div>
              <dt>Incorporated</dt>
              <dd className="mono">{fmtDate(r.overview.incorporated)}</dd>
            </div>
            <div>
              <dt>Industry classification</dt>
              <dd>
                {r.overview.classification} · {r.overview.sector}
              </dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{r.overview.location}</dd>
            </div>
            <div>
              <dt>Company type</dt>
              <dd>{r.overview.type || "—"}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      {/* 4 · Industry snapshot */}
      <Card>
        <CardHeader children={<SectionHead n={4} title="Industry snapshot" />} />
        <CardBody>
          <div className="metric-row">
            <Stat size="sm" label={`Businesses · ${r.industry.sector}`} value={fmtNumber(r.industry.businesses)} />
            <Stat size="sm" label="New registrations (12m)" value={fmtNumber(r.industry.newLastYear)} />
            <Stat size="sm" label="Annual growth" value={fmtDelta(r.industry.annualGrowth)} delta={fmtDelta(r.industry.annualGrowth)} />
          </div>
          <Source>{r.industry.source}</Source>
        </CardBody>
      </Card>

      {/* 5 · Competition snapshot */}
      <Card>
        <CardHeader children={<SectionHead n={5} title="Competition snapshot" />} />
        <CardBody>
          <div className="metric-row metric-row--4">
            <Stat size="sm" label={`Similar companies · ${r.local.region}`} value={fmtNumber(r.local.inSameIndustry)} />
            <Stat size="sm" label="New entrants (12m)" value={fmtNumber(r.local.newEntrants)} />
            <Stat size="sm" label="Market density" value={r.local.density} />
            <Stat size="sm" label="Regional concentration" value={r.trends.concentration.startsWith("Highly") ? "High" : "Moderate"} />
          </div>
          <Source>{r.local.source}</Source>
        </CardBody>
      </Card>

      {/* 6 · Growth & survival (merged) */}
      <Card>
        <CardHeader children={<SectionHead n={6} title="Growth & survival" />} />
        <CardBody>
          <div className="metric-row metric-row--2">
            <Stat size="sm" label="National sector growth" value={fmtDelta(r.regional.nationalGrowth)} />
            <Stat size="sm" label={`Regional growth · ${r.overview.location}`} value={fmtDelta(r.regional.regionalGrowth)} />
          </div>
          <div className="insight">
            <span className="insight__icon">
              <Icon name="trendUp" size={18} />
            </span>
            <span className="insight__text">{r.regional.insight}</span>
          </div>
          <div className="bench" style={{ marginTop: 16 }}>
            {[
              ["1-year survival", r.survival.oneYear],
              ["3-year survival", r.survival.threeYear],
              ["5-year survival", r.survival.fiveYear],
            ].map(([label, val]) => (
              <div className="bench__row" key={label as string}>
                <span className="bench__label">{label}</span>
                <div className="bench__track">
                  <div className="bench__fill" style={{ width: `${val as number}%` }} />
                </div>
                <span className="bench__val">{fmtPercent(val as number)}</span>
              </div>
            ))}
          </div>
          <Source>{r.regional.source}; {r.survival.source}</Source>
        </CardBody>
      </Card>

      {/* 7 · Local economic indicators */}
      <Card>
        <CardHeader children={<SectionHead n={7} title="Local economic indicators" />} />
        <CardBody>
          <div className="metric-row metric-row--4">
            <Stat size="sm" label="Population" value={fmtNumber(r.economic.population)} />
            <Stat size="sm" label="Employment rate" value={fmtPercent(r.economic.employmentRate)} />
            <Stat size="sm" label="Economic activity" value={fmtPercent(r.economic.economicActivityRate)} />
            <Stat size="sm" label="Median weekly pay" value={`£${fmtNumber(r.economic.medianWeeklyPay)}`} />
          </div>
          <Source>{r.economic.source}</Source>
        </CardBody>
      </Card>

      {/* 8 · Industry trends */}
      <Card>
        <CardHeader children={<SectionHead n={8} title="Industry trends" />} />
        <CardBody>
          <dl className="detail-list">
            <div>
              <dt>Growth trajectory</dt>
              <dd>{r.trends.trajectory}</dd>
            </div>
            <div>
              <dt>Regional concentration</dt>
              <dd>{r.trends.concentration}</dd>
            </div>
            <div>
              <dt>Emerging locations</dt>
              <dd>{r.trends.emerging}</dd>
            </div>
            <div>
              <dt>Sector momentum</dt>
              <dd>{r.trends.momentum}</dd>
            </div>
          </dl>
          <Source>{r.trends.source}</Source>
        </CardBody>
      </Card>

      {/* 9 · Market outlook */}
      <Card>
        <CardHeader children={<SectionHead n={9} title="Market outlook" />} action={<Badge tone="accent">Evidence-based</Badge>} />
        <CardBody>
          <ul className="recs">
            {r.outlook.items.map((item, i) => (
              <li key={i}>
                <span className="recs__num mono">{i + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Source>{r.outlook.source}</Source>
        </CardBody>
      </Card>

      {/* 10 · Startup readiness (educational) */}
      <Card>
        <CardHeader children={<SectionHead n={10} title="Startup readiness" />} action={<Badge tone="neutral">Educational</Badge>} />
        <CardBody>
          <p className="rsec__note">Common foundations for a newly incorporated business. Not assessed for this company.</p>
          <ReadinessList items={STARTUP_FOUNDATIONS} status="Not Assessed" />
        </CardBody>
      </Card>

      {/* 11 · Similar companies */}
      <Card>
        <CardHeader children={<SectionHead n={11} title="Similar companies" />} action={<Badge tone="neutral">{similar.length}</Badge>} />
        <CardBody>
          {similar.length ? (
            <div className="sim-list">
              {similar.map((s) => (
                <Link key={s.number} href={`/company/${s.number}`} className="sim-row">
                  <div className="sim-row__main">
                    <div className="sim-row__name">{s.name}</div>
                    <div className="sim-row__meta mono">
                      {s.number}
                      {s.sicCode ? ` · SIC ${s.sicCode}` : ""}
                      {s.region ? ` · ${s.region}` : ""}
                    </div>
                  </div>
                  <Icon name="chevronRight" size={15} className="sim-row__chev" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="rsec__note">No active companies found with the same SIC code.</p>
          )}
          <Source>Companies House · same SIC code (same-region first)</Source>
        </CardBody>
      </Card>

      <p className="report__disclaimer">
        CompaniesIQ presents evidence drawn from Companies House, ONS and Nomis. Figures marked &ldquo;derived&rdquo; are
        estimated from registered-office region and published baselines. This briefing is educational and does not
        constitute financial advice.
      </p>
    </div>
  );
}
