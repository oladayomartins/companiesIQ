import Link from "next/link";
import { Suspense } from "react";
import { Card, CardHeader, CardBody, Stat, StatusPill, Badge, CompanyAvatar, Icon } from "@/components/ds";
import { ScorePill } from "@/components/app/ScorePill";
import { DateRangeSelector } from "@/components/app/DateRangeSelector";
import { getRegisterKpis, getRecentIncorporations, getRecentDissolutions } from "@/lib/live-stats";
import { rangeDays } from "@/lib/ranges";
import { fmtNumber, fmtDate, fmtDelta, ageLabel } from "@/lib/format";
import type { EnrichedResult } from "@/lib/data";

export const metadata = { title: "Dashboard · CompaniesIQ" };
export const revalidate = 300;

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
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
              {c.classification ? ` · ${c.classification.code}` : ""}
            </div>
          </div>
        </Link>
      </td>
      <td className="muted">{c.region ?? "—"}</td>
      <td className="num mono">{c.incorporated ? fmtDate(c.incorporated) : "—"}</td>
      <td className="num">
        <ScorePill score={c.score} />
      </td>
    </tr>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const { label, days } = rangeDays(range);
  const windowLabel = label.replace(/^Last /, "").toLowerCase(); // e.g. "30 days"

  let kpis = null as Awaited<ReturnType<typeof getRegisterKpis>> | null;
  let recent: EnrichedResult[] = [];
  let dissolved: EnrichedResult[] = [];
  let error: string | null = null;
  try {
    [kpis, recent, dissolved] = await Promise.all([
      getRegisterKpis(days),
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
          <h1 className="screen-title">Today on the UK register</h1>
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

          <div className="dash-cols">
            <Card>
              <CardHeader
                subtitle="Live"
                title="Recently incorporated"
                action={
                  <Link className="link-btn" href="/app/search?incorporated=12m">
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
                      <th className="num">
                        Opportunity <span className="pro-tag">Pro</span>
                      </th>
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
