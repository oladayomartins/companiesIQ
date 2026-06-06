import { Card, CardHeader, CardBody, Stat, Tabs, Badge } from "@/components/ds";
import { sectorBreakdown, fastestGrowingSectors, UK_SURVIVAL_5YR } from "@/lib/analytics";
import { getRegisterKpis, getIncorporationTrend, getTrendingSignals } from "@/lib/live-stats";
import { fmtNumber, fmtDelta } from "@/lib/format";
import { IncorporationTrend, SectorBars } from "@/components/app/Charts";

export const metadata = { title: "Analytics · CompaniesIQ" };
export const revalidate = 3600;

export default async function AnalyticsPage() {
  const sectors = sectorBreakdown();
  const sectorData = sectors.map((s) => ({ name: s.name, count: s.count }));
  const fastest = fastestGrowingSectors(6);

  let kpis = null as Awaited<ReturnType<typeof getRegisterKpis>> | null;
  let trendData: { month: string; value: number }[] = [];
  let trending: Awaited<ReturnType<typeof getTrendingSignals>> = [];
  let error: string | null = null;
  try {
    [kpis, trendData, trending] = await Promise.all([getRegisterKpis(), getIncorporationTrend(), getTrendingSignals()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Companies House unavailable";
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Market analytics · UK register</div>
          <h1 className="screen-title">Incorporation trends</h1>
        </div>
        <Tabs variant="pill" tabs={["12 months"]} />
      </div>

      {error ? <div className="app-error">{error}</div> : null}

      <div className="kpi-grid">
        <Card>
          <CardBody>
            <Stat label="Active companies" value={kpis ? fmtNumber(kpis.active) : "—"} sub="live" />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat label="New (30 days)" value={kpis ? fmtNumber(kpis.new30d) : "—"} sub="incorporations" />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat label="Dissolved (30 days)" value={kpis ? fmtNumber(kpis.dissolved30d) : "—"} />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat label="5-yr survival" value={UK_SURVIVAL_5YR} sub="ONS reference" />
          </CardBody>
        </Card>
      </div>

      <div className="dash-cols">
        <Card>
          <CardHeader subtitle="Monthly · live" title="New incorporations" action={<Badge tone="pos" dot>Companies House</Badge>} />
          <CardBody>
            {trendData.length ? <IncorporationTrend data={trendData} /> : <div className="app-loading">Loading trend…</div>}
            <div className="report__disclaimer" style={{ paddingTop: 10 }}>
              Source · Companies House advanced search (monthly incorporation counts, trailing 12 months).
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader subtitle="By sector" title="Active companies by sector" action={<span className="app-eyebrow">ONS BPE</span>} />
          <CardBody>
            <SectorBars data={sectorData} />
            <div className="report__disclaimer" style={{ paddingTop: 10 }}>
              Source · ONS Business Population Estimates (sector totals; Companies House does not expose sector aggregates).
            </div>
          </CardBody>
        </Card>
      </div>

      <div style={{ marginTop: 18 }}>
        <Card>
          <CardHeader subtitle="Keyword engine · live" title="Trending signals" action={<Badge tone="accent" dot>Last 14 days</Badge>} />
          <CardBody>
            {trending.length ? (
              <div className="signal-chips">
                {trending.map((k) => (
                  <span className="signal-chip" key={k.key}>
                    {k.key} <span className="signal-chip__count">{k.count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="muted">No signals from the recent sample.</span>
            )}
            <div className="report__disclaimer" style={{ paddingTop: 12 }}>
              Extracted from names + SIC codes of companies incorporated in the last 14 days.
            </div>
          </CardBody>
        </Card>
      </div>

      <div style={{ marginTop: 18 }}>
        <Card>
          <CardHeader subtitle="Trailing 12 months" title="Fastest-growing sectors" action={<span className="app-eyebrow">Source · ONS</span>} />
          <CardBody flush>
            <table className="data-table data-table--full">
              <thead>
                <tr>
                  <th>Sector</th>
                  <th className="num">Annual growth</th>
                </tr>
              </thead>
              <tbody>
                {fastest.map((f) => (
                  <tr key={f.sector}>
                    <td>{f.sector}</td>
                    <td className="num">
                      <span className="mv mv--up">{fmtDelta(f.growth)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
