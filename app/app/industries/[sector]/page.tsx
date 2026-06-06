import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardBody, Stat, Badge, Icon } from "@/components/ds";
import { SECTOR_STATS, REGION_STATS } from "@/lib/ons";
import { regionBreakdown } from "@/lib/analytics";
import { fmtNumber, fmtDelta } from "@/lib/format";
import { slugify } from "@/lib/slug";

export function generateStaticParams() {
  return Object.values(SECTOR_STATS).map((s) => ({ sector: slugify(s.sector) }));
}

export default async function SectorPage({ params }: { params: Promise<{ sector: string }> }) {
  const { sector: slug } = await params;
  const stat = Object.values(SECTOR_STATS).find((s) => slugify(s.sector) === slug);
  if (!stat) notFound();

  const regions = regionBreakdown().slice(0, 6);

  return (
    <div className="screen profile">
      <Link className="back" href="/app/industries">
        <Icon name="arrowRight" size={15} style={{ transform: "rotate(180deg)" }} /> All industries
      </Link>

      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Industry intelligence</div>
          <h1 className="screen-title">{stat.sector}</h1>
        </div>
        <Badge tone={stat.annualGrowth >= 5 ? "pos" : "neutral"} dot>
          {fmtDelta(stat.annualGrowth)} annual growth
        </Badge>
      </div>

      <div className="profile-kpis">
        <Stat label="Active companies" value={fmtNumber(stat.businesses)} sub="UK total" />
        <Stat label="New (12m)" value={fmtNumber(stat.newLastYear)} delta={fmtDelta(stat.annualGrowth)} />
        <Stat label="1-yr survival" value={`${stat.survival.oneYear.toFixed(1)}%`} />
        <Stat label="5-yr survival" value={`${stat.survival.fiveYear.toFixed(1)}%`} />
      </div>

      <div className="profile-grid" style={{ marginTop: 18 }}>
        <Card>
          <CardHeader subtitle="ONS Business Demography" title="Survival benchmarks" />
          <CardBody>
            <div className="bench">
              {[
                ["1-year", stat.survival.oneYear],
                ["3-year", stat.survival.threeYear],
                ["5-year", stat.survival.fiveYear],
              ].map(([label, val]) => (
                <div className="bench__row" key={label as string}>
                  <span className="bench__label">{label}</span>
                  <div className="bench__track">
                    <div className="bench__fill" style={{ width: `${val as number}%` }} />
                  </div>
                  <span className="bench__val">{(val as number).toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <div className="source">
              <span className="source__dot">●</span> Source · ONS Business Demography
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader subtitle="Nomis" title="Regional growth index" />
          <CardBody>
            <div className="sector-list">
              {regions.map((r) => (
                <div className="sector" key={r.region}>
                  <div className="sector__top">
                    <span className="sector__name">{r.region}</span>
                    <span className="sector__count mono">{(r.growthIndex).toFixed(2)}×</span>
                  </div>
                  <div className="sector__track">
                    <div className="sector__fill" style={{ width: r.share * 100 + "%" }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="source">
              <span className="source__dot">●</span> Source · Nomis regional indicators
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
