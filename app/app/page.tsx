import Link from "next/link";
import { Suspense } from "react";
import { Card, CardHeader, CardBody, Stat, StatusPill, Badge } from "@/components/ds";
import { DateRangeSelector } from "@/components/app/DateRangeSelector";
import { getRegisterKpis, getRadarData, type RadarData, type RadarBucket } from "@/lib/live-stats";
import { rangeDays } from "@/lib/ranges";
import { fmtNumber, fmtDate, fmtDelta } from "@/lib/format";
import { slugify } from "@/lib/slug";

export const metadata = { title: "Dashboard · CompaniesIQ" };
export const revalidate = 300;

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** A compact ranked list — the dashboard's core scannable unit. */
function RankList({ items, href }: { items: RadarBucket[]; href?: (b: RadarBucket) => string }) {
  if (!items.length) {
    return (
      <CardBody flush>
        <div className="alert-row">
          <span className="muted">No data in this window.</span>
        </div>
      </CardBody>
    );
  }
  return (
    <CardBody flush>
      {items.map((b, i) => {
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
      })}
    </CardBody>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const { label, days } = rangeDays(range);
  const windowLabel = label.replace(/^Last /, "").toLowerCase(); // e.g. "30 days"

  let kpis = null as Awaited<ReturnType<typeof getRegisterKpis>> | null;
  let radar: RadarData | null = null;
  let error: string | null = null;
  try {
    [kpis, radar] = await Promise.all([getRegisterKpis(days), getRadarData(days)]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Companies House unavailable";
  }

  const netTone = kpis && kpis.netNew >= 0 ? "up" : "down";
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
                <Stat label="New companies" value={fmtNumber(kpis!.incorporations)} sub={windowLabel} />
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat label="Dissolved" value={fmtNumber(kpis!.dissolutions)} sub={windowLabel} />
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat label="Active companies" value={fmtNumber(kpis!.active)} sub="on the register" />
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

          {/* ---- What's growing / where / what activity ---- */}
          <div className="tri-cols">
            <Card>
              <CardHeader subtitle="Most active industries" title="What's growing" />
              <RankList items={radar?.industries ?? []} href={(b) => `/app/industries/${slugify(b.key)}`} />
            </Card>
            <Card>
              <CardHeader subtitle="Where new companies register" title="Top regions" />
              <RankList items={radar?.regions ?? []} />
            </Card>
            <Card>
              <CardHeader subtitle="Most-registered SIC activities" title="Business activities" />
              <RankList items={radar?.activities ?? []} />
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
              <table className="data-table data-table--full">
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
                    recent.map((c) => (
                      <tr key={c.number}>
                        <td>
                          <Link href={`/app/company/${c.number}`} className="cell-co" style={{ textDecoration: "none" }}>
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
                </tbody>
              </table>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
