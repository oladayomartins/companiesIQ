import Link from "next/link";
import { Card, CardBody, Badge, Icon } from "@/components/ds";
import { SECTOR_STATS } from "@/lib/ons";
import { fmtNumber, fmtDelta } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { getCurrentUser } from "@/lib/supabase/server";
import { hasProAccess } from "@/lib/access";
import { ProGate } from "@/components/app/ProGate";

export const metadata = { title: "Industries · CompaniesIQ" };
export const dynamic = "force-dynamic";

export default async function IndustriesPage() {
  if (!(await hasProAccess(await getCurrentUser()))) {
    return (
      <ProGate
        icon="building"
        title="Industry intelligence"
        features={["Every UK sector ranked by activity", "Growth & 5-yr survival benchmarks", "Drill into any sector's companies"]}
      />
    );
  }
  const sectors = Object.values(SECTOR_STATS).sort((a, b) => b.businesses - a.businesses);
  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Industry intelligence</div>
          <h1 className="screen-title">Markets, by sector</h1>
        </div>
      </div>

      <Card variant="flat">
        <CardBody flush>
          <div className="table-scroll"><table className="data-table data-table--full">
            <thead>
              <tr>
                <th>Sector</th>
                <th className="num">Active companies</th>
                <th className="num">New (12m)</th>
                <th className="num">Annual growth</th>
                <th className="num">5-yr survival</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((s) => (
                <tr key={s.sector}>
                  <td>
                    <Link href={`/app/industries/${slugify(s.sector)}`} className="cell-co__name" style={{ textDecoration: "none" }}>
                      {s.sector}
                    </Link>
                  </td>
                  <td className="num mono">{fmtNumber(s.businesses)}</td>
                  <td className="num mono">{fmtNumber(s.newLastYear)}</td>
                  <td className="num">
                    <span className={"mv " + (s.annualGrowth >= 0 ? "mv--up" : "mv--down")}>
                      <Icon name={s.annualGrowth >= 0 ? "trendUp" : "trendDown"} size={13} />
                      {fmtDelta(s.annualGrowth)}
                    </span>
                  </td>
                  <td className="num mono">{s.survival.fiveYear.toFixed(1)}%</td>
                  <td className="num">
                    <Link href={`/app/industries/${slugify(s.sector)}`}>
                      <Icon name="chevronRight" size={16} color="var(--text-faint)" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </CardBody>
      </Card>
      <div className="report__disclaimer">
        Source · Companies House (active counts) + ONS Business Demography (survival) + ONS Business Population Estimates (growth).
      </div>
    </div>
  );
}
