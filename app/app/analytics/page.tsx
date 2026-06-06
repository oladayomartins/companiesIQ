import { Card, CardHeader, CardBody, Stat, Tabs, Badge } from "@/components/ds";
import { sectorBreakdown, fastestGrowingSectors, UK_SURVIVAL_5YR } from "@/lib/analytics";
import { getRegisterKpis, getIncorporationTrend, getActivityBreakdown } from "@/lib/live-stats";
import { fmtNumber, fmtDelta } from "@/lib/format";
import { IncorporationTrend, SectorBars } from "@/components/app/Charts";

export const metadata = { title: "Markets · CompaniesIQ" };
export const revalidate = 3600;

function RankList({ items, suffix }: { items: { key: string; label: string; count: number }[]; suffix?: string }) {
  return (
    <CardBody flush>
      {items.length ? (
        items.map((it, i) => (
          <div className="alert-row" key={it.key}>
            <span className="hotspot__rank">{i + 1}</span>
            <div className="alert-row__main">
              <div className="alert-row__name">{it.label}</div>
              {suffix === "sic" ? <div className="alert-row__rule">SIC {it.key}</div> : null}
            </div>
            <span className="hotspot__val">{fmtNumber(it.count)}</span>
          </div>
        ))
      ) : (
        <div className="alert-row">
          <span className="muted">No sample available.</span>
        </div>
      )}
    </CardBody>
  );
}

export default async function MarketsPage() {
  const sectors = sectorBreakdown();
  const sectorData = sectors.map((s) => ({ name: s.name, count: s.count }));
  const fastest = fastestGrowingSectors(6);

  let kpis = null as Awaited<ReturnType<typeof getRegisterKpis>> | null;
  let trendData: { month: string; value: number }[] = [];
  let activity = null as Awaited<ReturnType<typeof getActivityBreakdown>> | null;
  let error: string | null = null;
  try {
    [kpis, trendData, activity] = await Promise.all([getRegisterKpis(30), getIncorporationTrend(), getActivityBreakdown(30)]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Companies House unavailable";
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Markets · UK register</div>
          <h1 className="screen-title">Market trends</h1>
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
            <Stat label="New (30 days)" value={kpis ? fmtNumber(kpis.incorporations) : "—"} sub="incorporations" />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat label="Dissolved (30 days)" value={kpis ? fmtNumber(kpis.dissolutions) : "—"} />
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
              Source · ONS Business Population Estimates (reference baseline).
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="dash-cols" style={{ marginTop: 18 }}>
        <Card>
          <CardHeader subtitle="Live · last 30 days" title="Most active regions" />
          <RankList items={activity?.regions ?? []} />
        </Card>
        <Card>
          <CardHeader subtitle="Live · last 30 days" title="Most-registered SIC codes" />
          <RankList items={activity?.sics ?? []} suffix="sic" />
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
