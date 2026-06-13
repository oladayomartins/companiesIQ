import Link from "next/link";
import { Suspense } from "react";
import { Card, CardHeader, CardBody, Stat, StatusPill, Badge, Icon } from "@/components/ds";
import { DateRangeSelector } from "@/components/app/DateRangeSelector";
import { TrendLine } from "@/components/app/Charts";
import { getRegisterKpis, getRadarData, getFormationTrend, type RadarData, type RadarBucket } from "@/lib/live-stats";
import { getCurrentUser } from "@/lib/supabase/server";
import { hasProAccess } from "@/lib/access";
import { resolveRange } from "@/lib/ranges";
import { fmtNumber, fmtDate, fmtDelta } from "@/lib/format";
import { slugify } from "@/lib/slug";

export const metadata = { title: "Dashboard · CompaniesIQ" };
export const dynamic = "force-dynamic";

// Free accounts see the top N of every ranked list; the rest is blurred behind
// a Go-Pro CTA. Pro sees everything.
const FREE_VISIBLE = 3;

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** A compact ranked list — the dashboard's core scannable unit. */
function RankList({ items, href, locked = false }: { items: RadarBucket[]; href?: (b: RadarBucket) => string; locked?: boolean }) {
  if (!items.length) {
    return (
      <CardBody flush>
        <div className="alert-row">
          <span className="muted">No data in this window.</span>
        </div>
      </CardBody>
    );
  }
  const row = (b: RadarBucket, i: number) => {
    const inner = (
      <>
        <span className="hotspot__rank">{i + 1}</span>
        <div className="alert-row__main">
          <div className="alert-row__name">{b.label}</div>
          {b.sub ? <div className="alert-row__rule">{b.sub}</div> : null}
        </div>
        <span className="hotspot__val">{fmtNumber(b.count)}</span>
      </>
    );
    return href ? (
      <Link key={b.key} href={href(b)} className="alert-row" style={{ textDecoration: "none" }}>
        {inner}
      </Link>
    ) : (
      <div key={b.key} className="alert-row">
        {inner}
      </div>
    );
  };
  const visible = locked ? items.slice(0, FREE_VISIBLE) : items;
  const hidden = locked ? items.slice(FREE_VISIBLE) : [];
  return (
    <CardBody flush>
      {visible.map(row)}
      {hidden.length ? (
        <div className="list-lock">
          <div className="list-lock__blur" aria-hidden="true">
            {hidden.slice(0, 4).map((b, i) => row(b, i + FREE_VISIBLE))}
          </div>
          <Link className="list-lock__cta" href="/app/upgrade">
            <Icon name="shield" size={14} /> Go Pro to see all {items.length} →
          </Link>
        </div>
      ) : null}
    </CardBody>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const { range, from, to } = await searchParams;
  const win = resolveRange({ range, from, to });
  const { days, label } = win;
  const windowLabel = win.custom ? win.label : label.replace(/^Last /, "").toLowerCase(); // e.g. "30 days"
  const subscribed = await hasProAccess(await getCurrentUser());
  const locked = !subscribed;

  let kpis = null as Awaited<ReturnType<typeof getRegisterKpis>> | null;
  let radar: RadarData | null = null;
  let trend: { month: string; value: number }[] = [];
  let error: string | null = null;
  try {
    [kpis, radar, trend] = await Promise.all([
      getRegisterKpis(days, win.to),
      getRadarData(days, win.to),
      getFormationTrend(days, win.to).catch(() => []),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Companies House unavailable";
  }

  const netTone = kpis && kpis.netNew >= 0 ? "up" : "down";
  // Period-over-period comparison vs the preceding equal-length window.
  const pctDelta = (cur: number, prev: number): { delta?: string; deltaDir?: "up" | "down" | "flat" } => {
    if (!prev) return {};
    const p = ((cur - prev) / prev) * 100;
    return { delta: fmtDelta(p, 0), deltaDir: p > 0 ? "up" : p < 0 ? "down" : "flat" };
  };
  const newCmp = pctDelta(kpis?.incorporations ?? 0, kpis?.prevIncorporations ?? 0);
  const disCmp = pctDelta(kpis?.dissolutions ?? 0, kpis?.prevDissolutions ?? 0);
  const activeGrowth = kpis && kpis.active ? (kpis.netNew / kpis.active) * 100 : 0;
  const recent = (radar?.companies ?? [])
    .slice()
    .sort((a, b) => (b.incorporated || "").localeCompare(a.incorporated || ""))
    .slice(0, 10);

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">{todayLabel()}</div>
          <h1 className="screen-title">UK business formation activity</h1>
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
          {/* ---- What happened ---- */}
          <div className="kpi-grid">
            <Card>
              <CardBody>
                <Stat label="New companies" value={fmtNumber(kpis!.incorporations)} delta={newCmp.delta} deltaDir={newCmp.deltaDir} sub={windowLabel} />
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat label="Dissolved" value={fmtNumber(kpis!.dissolutions)} delta={disCmp.delta} deltaDir={disCmp.deltaDir} sub={windowLabel} />
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat
                  label="Active companies"
                  value={fmtNumber(kpis!.active)}
                  delta={fmtDelta(activeGrowth, 2)}
                  deltaDir={kpis!.netNew >= 0 ? "up" : "down"}
                  sub="on the register"
                />
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

          {/* ---- Formation trajectory ---- */}
          <Card style={{ marginBottom: 18 }}>
            <CardHeader
              subtitle={`New incorporations · ${windowLabel}`}
              title="Formation trend"
              action={<Badge tone="pos" dot>Companies House</Badge>}
            />
            <CardBody>
              {trend.length ? (
                <TrendLine data={trend} />
              ) : (
                <div className="app-loading">Trend temporarily unavailable — the register is busy. Refresh shortly.</div>
              )}
            </CardBody>
          </Card>

          {/* ---- What's growing / where / what activity ---- */}
          <div className="tri-cols">
            <Card>
              <CardHeader subtitle="Most active industries" title="What's growing" />
              <RankList items={radar?.industries ?? []} href={(b) => `/app/industries/${slugify(b.key)}`} locked={locked} />
            </Card>
            <Card>
              <CardHeader subtitle="Where new companies register" title="Top regions" />
              <RankList items={radar?.regions ?? []} locked={locked} />
            </Card>
            <Card>
              <CardHeader subtitle="Most-registered SIC activities" title="Business activities" />
              <RankList items={(radar?.activities ?? []).slice(0, 6)} locked={locked} />
            </Card>
          </div>

          {/* ---- Recent registrations ---- */}
          <Card style={{ marginTop: 18 }}>
            <CardHeader
              subtitle={`Newest in the last ${windowLabel}`}
              title="Recent registrations"
              action={
                <Link className="link-btn" href="/app/companies">
                  View all companies →
                </Link>
              }
            />
            <CardBody flush>
              <div className="table-scroll"><table className="data-table data-table--full">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Region</th>
                    <th className="num">Incorporated</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length ? (
                    (locked ? recent.slice(0, FREE_VISIBLE) : recent).map((c) => (
                      <tr key={c.number}>
                        <td>
                          <Link href={`/company/${c.number}`} className="cell-co" style={{ textDecoration: "none" }}>
                            <div>
                              <div className="cell-co__name">{c.name}</div>
                              <div className="cell-co__no">
                                {c.number}
                                {c.locality ? ` · ${c.locality}` : ""}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="muted">{c.region}</td>
                        <td className="num mono">{c.incorporated ? fmtDate(c.incorporated) : "—"}</td>
                        <td>
                          <StatusPill status={c.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="empty-row">
                      <td colSpan={4}>No recent registrations returned.</td>
                    </tr>
                  )}
                  {locked && recent.length > FREE_VISIBLE ? (
                    <tr className="lock-row">
                      <td colSpan={4}>
                        <Link href="/app/upgrade" className="lock-row__cta">
                          <Icon name="shield" size={15} /> Go Pro to see every new UK company registration →
                        </Link>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table></div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
