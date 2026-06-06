import Link from "next/link";
import { Suspense } from "react";
import { Card, CardHeader, CardBody, Stat, StatusPill, Badge, CompanyAvatar, Icon, type IconName } from "@/components/ds";
import { FactualTags } from "@/components/app/Tags";
import { DateRangeSelector } from "@/components/app/DateRangeSelector";
import { getRegisterKpis, getRecentIncorporations, getRecentDissolutions, getQuickInsights } from "@/lib/live-stats";
import { rangeDays } from "@/lib/ranges";
import { fmtNumber, fmtDate, fmtDelta, ageLabel } from "@/lib/format";
import type { EnrichedResult } from "@/lib/data";

export const metadata = { title: "Dashboard · CompaniesIQ" };
export const revalidate = 300;

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function Insight({ icon, label, value, sub }: { icon: IconName; label: string; value: string; sub?: string }) {
  return (
    <div className="insight-card">
      <span className="insight-card__icon">
        <Icon name={icon} size={18} />
      </span>
      <div>
        <div className="insight-card__label">{label}</div>
        <div className="insight-card__value">{value}</div>
        {sub ? <div className="insight-card__sub mono">{sub}</div> : null}
      </div>
    </div>
  );
}

function CompanyRow({ c }: { c: EnrichedResult }) {
  return (
    <tr>
      <td>
        <Link href={`/app/company/${c.number}`} className="cell-co" style={{ textDecoration: "none" }}>
          <CompanyAvatar name={c.name} size="sm" />
          <div>
            <div className="cell-co__name">{c.name}</div>
            <div className="cell-co__no">
              {c.number}
              {c.sicCodes[0] ? ` · ${c.sicCodes[0]}` : ""}
            </div>
          </div>
        </Link>
      </td>
      <td className="muted">{c.region ?? "—"}</td>
      <td className="num mono">{c.incorporated ? fmtDate(c.incorporated) : "—"}</td>
      <td>
        <FactualTags incorporated={c.incorporated} sector={c.classification?.sector} sicCodes={c.sicCodes} status={c.status} />
      </td>
    </tr>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const { label, days } = rangeDays(range);
  const windowLabel = label.replace(/^Last /, "").toLowerCase(); // e.g. "30 days"

  let kpis = null as Awaited<ReturnType<typeof getRegisterKpis>> | null;
  let insights = null as Awaited<ReturnType<typeof getQuickInsights>> | null;
  let recent: EnrichedResult[] = [];
  let dissolved: EnrichedResult[] = [];
  let error: string | null = null;
  try {
    [kpis, insights, recent, dissolved] = await Promise.all([
      getRegisterKpis(days),
      getQuickInsights(days),
      getRecentIncorporations(8, days),
      getRecentDissolutions(6, days),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Companies House unavailable";
  }

  const netTone = kpis && kpis.netNew >= 0 ? "up" : "down";

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">{todayLabel()}</div>
          <h1 className="screen-title">UK register overview</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Suspense fallback={null}>
            <DateRangeSelector />
          </Suspense>
          <Badge tone="pos" dot>
            Live · Companies House
          </Badge>
        </div>
      </div>

      {error ? (
        <div className="app-error">{error}</div>
      ) : (
        <>
          <div className="kpi-grid">
            <Card>
              <CardBody>
                <Stat label="Active companies" value={fmtNumber(kpis!.active)} sub="on the register" />
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat label="New incorporations" value={fmtNumber(kpis!.incorporations)} sub={windowLabel} />
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat label="Dissolutions" value={fmtNumber(kpis!.dissolutions)} sub={windowLabel} />
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat
                  label="Net change"
                  value={`${kpis!.netNew >= 0 ? "+" : ""}${fmtNumber(kpis!.netNew)}`}
                  deltaDir={netTone}
                  delta={kpis!.incorporations ? fmtDelta((kpis!.netNew / kpis!.incorporations) * 100, 0) : undefined}
                  sub={windowLabel}
                />
              </CardBody>
            </Card>
          </div>

          {insights ? (
            <Card style={{ marginBottom: 22 }}>
              <CardHeader subtitle="Quick insights" title="What's moving" action={<span className="app-eyebrow">Companies House · ONS · Nomis</span>} />
              <CardBody>
                <div className="insight-grid">
                  <Insight icon="trendUp" label="Fastest-growing sector" value={insights.fastestSector.name} sub={`${fmtDelta(insights.fastestSector.growth)} / yr · ONS`} />
                  <Insight icon="pin" label="Most active region" value={insights.topRegion?.label ?? "—"} sub={insights.topRegion ? `${insights.topRegion.count} recent incs` : ""} />
                  <Insight icon="building" label="Most-registered SIC" value={insights.topSic?.label ?? "—"} sub={insights.topSic ? `${insights.topSic.key} · ${insights.topSic.count} recent` : ""} />
                  <Insight icon="globe" label="Fastest-growing region" value={insights.fastestRegion.name} sub={`${insights.fastestRegion.index.toFixed(2)}× index · Nomis`} />
                </div>
              </CardBody>
            </Card>
          ) : null}

          <div className="dash-cols">
            <Card>
              <CardHeader
                subtitle="Live"
                title="Recently incorporated"
                action={
                  <Link className="link-btn" href="/app/companies?incorporated=30d">
                    View all
                  </Link>
                }
              />
              <CardBody flush>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Region</th>
                      <th className="num">Incorporated</th>
                      <th>Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.length ? (
                      recent.map((c) => <CompanyRow key={c.number} c={c} />)
                    ) : (
                      <tr className="empty-row">
                        <td colSpan={4}>No recent incorporations returned.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardBody>
            </Card>

            <Card>
              <CardHeader subtitle="Live" title="Newly dissolved" action={<Badge tone="neg" dot>Status change</Badge>} />
              <CardBody flush>
                <div className="signal-list">
                  {dissolved.length ? (
                    dissolved.map((c) => (
                      <Link className="signal" key={c.number} href={`/app/company/${c.number}`} style={{ textDecoration: "none" }}>
                        <span className="signal__icon signal__icon--neg">
                          <Icon name="alert" size={16} />
                        </span>
                        <div className="signal__body">
                          <div className="signal__top">
                            <span className="signal__kind">Dissolved</span>
                            <span className="signal__time">{c.region ?? ""}</span>
                          </div>
                          <div className="signal__co">{c.name}</div>
                          <div className="signal__detail">
                            {c.number}
                            {c.incorporated ? ` · ${ageLabel(c.incorporated)} old` : ""}
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="mini-feed__row">
                      <span className="mini-feed__label muted" style={{ padding: 12 }}>
                        No dissolutions in this window.
                      </span>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
