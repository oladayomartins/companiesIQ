import { Card, CardHeader, CardBody, Stat, Badge, Icon } from "@/components/ds";
import type { IntelligenceReport as Report } from "@/lib/analytics";
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

export function IntelligenceReport({ report }: { report: Report }) {
  const r = report;
  return (
    <div className="report">
      <p className="report__intro">
        A market briefing for {r.overview.name}, assembled from the public register and official economic data. Every
        figure below is sourced and dated — educational, not promotional.
      </p>

      {/* At-a-glance — the market verdict in one row */}
      <Card>
        <CardBody>
          <div className="metric-row metric-row--5">
            <Stat size="sm" label="Industry" value={r.overview.sector} />
            <Stat size="sm" label={`Similar · ${r.local.region}`} value={fmtNumber(r.local.inSameIndustry)} />
            <Stat size="sm" label="Regional growth" value={fmtDelta(r.regional.regionalGrowth)} />
            <Stat size="sm" label="5-yr survival" value={fmtPercent(r.survival.fiveYear)} />
            <Stat size="sm" label="New (12m)" value={fmtNumber(r.local.newEntrants)} />
          </div>
        </CardBody>
      </Card>

      {/* 1 · Business Overview */}
      <Card>
        <CardHeader children={<SectionHead n={1} title="Business overview" />} />
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

      {/* 2 · Industry Snapshot */}
      <Card>
        <CardHeader children={<SectionHead n={2} title="Industry snapshot" />} />
        <CardBody>
          <div className="metric-row">
            <Stat size="sm" label={`Businesses · ${r.industry.sector}`} value={fmtNumber(r.industry.businesses)} />
            <Stat size="sm" label="New registrations (12m)" value={fmtNumber(r.industry.newLastYear)} />
            <Stat size="sm" label="Annual growth" value={fmtDelta(r.industry.annualGrowth)} delta={fmtDelta(r.industry.annualGrowth)} />
          </div>
          <Source>{r.industry.source}</Source>
        </CardBody>
      </Card>

      {/* 3 · Local Market Analysis */}
      <Card>
        <CardHeader children={<SectionHead n={3} title="Local market analysis" />} />
        <CardBody>
          <div className="metric-row">
            <Stat size="sm" label={`Same industry · ${r.local.region}`} value={fmtNumber(r.local.inSameIndustry)} />
            <Stat size="sm" label="New entrants (12m)" value={fmtNumber(r.local.newEntrants)} />
            <Stat size="sm" label="Market density" value={r.local.density} />
          </div>
          <Source>{r.local.source}</Source>
        </CardBody>
      </Card>

      {/* 4 · Industry Survival Benchmarks */}
      <Card>
        <CardHeader children={<SectionHead n={4} title="Industry survival benchmarks" />} />
        <CardBody>
          <div className="bench">
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
          <Source>{r.survival.source}</Source>
        </CardBody>
      </Card>

      {/* 5 · Regional growth analysis */}
      <Card>
        <CardHeader children={<SectionHead n={5} title="Regional growth analysis" />} />
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
          <Source>{r.regional.source}</Source>
        </CardBody>
      </Card>

      {/* 6 · Local Economic Indicators */}
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

      {/* 7 · Industry Trends */}
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

      <p className="report__disclaimer">
        CompaniesIQ presents evidence drawn from Companies House, ONS and Nomis. Figures marked &ldquo;derived&rdquo; are
        estimated from registered-office region and published baselines. This briefing is educational and does not
        constitute financial advice.
      </p>
    </div>
  );
}
