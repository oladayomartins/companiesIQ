import Link from "next/link";
import { Card, CardHeader, CardBody, Stat, Badge, Icon } from "@/components/ds";
import type { IntelligenceReport as Report, SimilarCompany } from "@/lib/analytics";
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
const DIGITAL_PRESENCE = ["Website", "Google Business Profile", "Professional email", "Social presence", "Reviews"];

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

export function IntelligenceReport({ report, similar = [] }: { report: Report; similar?: SimilarCompany[] }) {
  const r = report;
  return (
    <div className="report">
      <p className="report__intro">
        A market briefing for {r.overview.name}, assembled from the public register and official economic data. Every
        figure below is sourced and dated — educational, not promotional.
      </p>

      {/* 1 · Market summary */}
      <Card>
        <CardHeader children={<SectionHead n={1} title="Market summary" />} />
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

      {/* 2 · Business overview */}
      <Card>
        <CardHeader children={<SectionHead n={2} title="Business overview" />} />
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

      {/* 3 · Industry snapshot */}
      <Card>
        <CardHeader children={<SectionHead n={3} title="Industry snapshot" />} />
        <CardBody>
          <div className="metric-row">
            <Stat size="sm" label={`Businesses · ${r.industry.sector}`} value={fmtNumber(r.industry.businesses)} />
            <Stat size="sm" label="New registrations (12m)" value={fmtNumber(r.industry.newLastYear)} />
            <Stat size="sm" label="Annual growth" value={fmtDelta(r.industry.annualGrowth)} delta={fmtDelta(r.industry.annualGrowth)} />
          </div>
          <Source>{r.industry.source}</Source>
        </CardBody>
      </Card>

      {/* 4 · Competition snapshot */}
      <Card>
        <CardHeader children={<SectionHead n={4} title="Competition snapshot" />} />
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

      {/* 5 · Growth & survival (merged) */}
      <Card>
        <CardHeader children={<SectionHead n={5} title="Growth & survival" />} />
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

      {/* 6 · Local economic indicators */}
      <Card>
        <CardHeader children={<SectionHead n={6} title="Local economic indicators" />} />
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

      {/* 7 · Industry trends */}
      <Card>
        <CardHeader children={<SectionHead n={7} title="Industry trends" />} />
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

      {/* 8 · Market outlook */}
      <Card>
        <CardHeader children={<SectionHead n={8} title="Market outlook" />} action={<Badge tone="accent">Evidence-based</Badge>} />
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

      {/* 9 · Startup readiness (educational) */}
      <Card>
        <CardHeader children={<SectionHead n={9} title="Startup readiness" />} action={<Badge tone="neutral">Educational</Badge>} />
        <CardBody>
          <p className="rsec__note">Common foundations for a newly incorporated business. Not assessed for this company.</p>
          <ReadinessList items={STARTUP_FOUNDATIONS} status="Not Assessed" />
        </CardBody>
      </Card>

      {/* 10 · Digital presence readiness (educational) */}
      <Card>
        <CardHeader children={<SectionHead n={10} title="Digital presence readiness" />} action={<Badge tone="neutral">Educational</Badge>} />
        <CardBody>
          <p className="rsec__note">Online-visibility signals. Not assessed yet — these are measured only when enrichment is enabled.</p>
          <ReadinessList items={DIGITAL_PRESENCE} status="Unknown" />
        </CardBody>
      </Card>

      {/* 11 · Similar companies */}
      <Card>
        <CardHeader children={<SectionHead n={11} title="Similar companies" />} action={<Badge tone="neutral">{similar.length}</Badge>} />
        <CardBody>
          {similar.length ? (
            <div className="sim-list">
              {similar.map((s) => (
                <Link key={s.number} href={`/app/company/${s.number}`} className="sim-row">
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
