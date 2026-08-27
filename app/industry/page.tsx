// PUBLIC industries index — the data-INDEX archetype.
//
// Breadcrumb → masthead (h1 + lede + live "updated" stamp) → headline figures →
// controls → the list → source line. Every figure and every row is server
// rendered; the filter and the cards/table toggle are enhancements over that
// list, never the only way to reach a sector.
import type { Metadata } from "next";
import { SECTOR_STATS } from "@/lib/ons";
import { fmtNumber, fmtDate } from "@/lib/format";
import { getRegisterAsOf } from "@/lib/live-stats";
import { PublicShell, PublicCta } from "@/components/public/PublicShell";
import { Breadcrumbs, DatasetLd } from "@/components/public/Breadcrumbs";
import { SectorExplorer } from "@/components/public/SectorExplorer";
import { CountUp } from "@/components/public/CountUp";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "UK industries — company data by sector",
  description:
    "Browse UK industries by sector: active companies, new registrations, growth and survival benchmarks from Companies House, ONS and Nomis.",
  alternates: { canonical: "/industry" },
  openGraph: { title: "UK industries — company data by sector", url: `${SITE_URL}/industry`, type: "website" },
};

export default async function IndustriesIndex() {
  const sectors = Object.values(SECTOR_STATS).sort((a, b) => b.businesses - a.businesses);

  // The stamp reads the live register date, never a build constant, so it can't
  // claim freshness the data doesn't have.
  const asOf = await getRegisterAsOf().catch(() => null);

  const totalActive = sectors.reduce((n, s) => n + s.businesses, 0);
  const totalNew = sectors.reduce((n, s) => n + s.newLastYear, 0);
  const fastest = sectors.reduce((a, b) => (b.annualGrowth > a.annualGrowth ? b : a));

  // `count` carries the raw number so the figure can animate from the value the
  // server already painted; `value` is the string that renders without JS.
  const headline: { label: string; value: string; note: string; count?: number }[] = [
    { label: "Active companies", value: fmtNumber(totalActive), note: "across all sectors", count: totalActive },
    { label: "New · 12 months", value: fmtNumber(totalNew), note: "incorporations", count: totalNew },
    { label: "Sectors", value: String(sectors.length), note: "SIC groupings" },
    // The figure slot stays numeric across all four — a long sector name set at
    // 34px breaks the rhythm and wraps unpredictably. The name is the caption.
    { label: "Fastest growing", value: `+${fastest.annualGrowth.toFixed(1)}%`, note: `${fastest.sector}, a year` },
  ];

  return (
    <PublicShell>
      <DatasetLd
        name="UK company data by sector"
        description="Active companies, new registrations and annual growth for every major UK industry sector, from the Companies House register with ONS business demography."
        path="/industry"
        dateModified={asOf ?? new Date().toISOString().slice(0, 10)}
      />
      <div className="screen">
        <Breadcrumbs crumbs={[{ href: "/", label: "Home" }, { label: "Industries" }]} />

        <div className="dx-masthead">
          <div>
            <div className="app-eyebrow">UK sector company data</div>
            <h1 className="screen-title">Industries</h1>
            <p className="public-lede dx-lede">
              Live company counts, new registrations and growth for every major UK sector. Pick a sector to see its
              regions, survival benchmarks and newest companies.
            </p>
          </div>
          {asOf ? (
            <div className="dx-stamp">
              <span className="dx-stamp__k mono">Updated</span>
              <span className="dx-stamp__v mono">{fmtDate(asOf)}</span>
            </div>
          ) : null}
        </div>

        <div className="dx-stats">
          {headline.map((s) => (
            <div className="dx-stat" key={s.label}>
              <span className="dx-stat__k mono">{s.label}</span>
              <span className="dx-stat__v">
                {s.count != null ? <CountUp value={s.count} /> : s.value}
              </span>
              <span className="dx-stat__n">{s.note}</span>
            </div>
          ))}
        </div>

        <SectorExplorer
          sectors={sectors.map((s) => ({
            sector: s.sector,
            businesses: s.businesses,
            newLastYear: s.newLastYear,
            annualGrowth: s.annualGrowth,
          }))}
        />

        <p className="dx-source mono">
          Source · Companies House register, reused under the Open Government Licence v3.0 · sector totals and growth
          from ONS business demography
          {asOf ? ` · register queried ${fmtDate(asOf)}` : ""}
        </p>

        <PublicCta
          title="Go deeper than the sector"
          sub="Create a free account to read a full company intelligence report, or upgrade for unlimited access."
        />
      </div>
    </PublicShell>
  );
}
