// PUBLIC regional market intelligence — an indexable SEO landing page per UK
// region. ONS baselines + live Nomis indicators + recent local registrations,
// linking out to /company reports and /industry pages.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardHeader, CardBody, Stat, Badge, Icon, CompanyAvatar } from "@/components/ds";
import { FactualTags } from "@/components/app/Tags";
import { REGION_STATS } from "@/lib/ons";
import { getRegionLive } from "@/lib/nomis";
import { explore, type EnrichedResult } from "@/lib/data";
import { isoDaysAgo } from "@/lib/companies-house";
import { fmtNumber, fmtDate } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { FEATURED_SECTORS } from "@/lib/sic";
import { PublicShell, PublicCta } from "@/components/public/PublicShell";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export function generateStaticParams() {
  return Object.values(REGION_STATS).map((r) => ({ region: slugify(r.region) }));
}

function statForSlug(slug: string) {
  return Object.values(REGION_STATS).find((r) => slugify(r.region) === slug) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ region: string }> }): Promise<Metadata> {
  const { region } = await params;
  const stat = statForSlug(region);
  if (!stat) return { title: "Region" };
  const desc = `${stat.region} business data: ${fmtNumber(stat.population)} population, ${stat.employmentRate.toFixed(
    1,
  )}% employment, £${fmtNumber(stat.medianWeeklyPay)} median weekly pay. Live UK company registrations and regional economic indicators from Companies House, ONS & Nomis.`;
  return {
    title: `${stat.region} — UK business & economic data`,
    description: desc,
    alternates: { canonical: `/market/${region}` },
    openGraph: { title: `${stat.region} — UK business & economic data`, description: desc, url: `${SITE_URL}/market/${region}`, type: "website" },
  };
}

export default async function MarketPage({ params }: { params: Promise<{ region: string }> }) {
  const { region: slug } = await params;
  const stat = statForSlug(slug);
  if (!stat) notFound();

  const [live, recentRes] = await Promise.all([
    getRegionLive(stat.region).catch(() => null),
    explore({ region: stat.region, incorporatedFrom: isoDaysAgo(90), incorporatedTo: isoDaysAgo(0), status: ["active"], size: 100 })
      .then((r) => r.results.slice(0, 8))
      .catch(() => [] as EnrichedResult[]),
  ]);
  const recent = recentRes;
  const pop = live?.population ?? stat.population;
  const emp = live?.employmentRate ?? stat.employmentRate;
  const pay = live?.medianWeeklyPay ?? stat.medianWeeklyPay;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Markets", item: `${SITE_URL}/market` },
      { "@type": "ListItem", position: 2, name: stat.region, item: `${SITE_URL}/market/${slug}` },
    ],
  };

  return (
    <PublicShell>
      <JsonLd data={breadcrumb} />
      <div className="screen profile">
        <Link className="back" href="/market">
          <Icon name="arrowRight" size={15} style={{ transform: "rotate(180deg)" }} /> All regions
        </Link>

        <div className="screen-head">
          <div>
            <div className="app-eyebrow">UK regional market intelligence</div>
            <h1 className="screen-title">{stat.region}</h1>
          </div>
          <Badge tone={stat.growthIndex >= 1 ? "pos" : "neutral"} dot>
            {stat.growthIndex.toFixed(2)}× growth index
          </Badge>
        </div>

        <div className="profile-kpis">
          <Stat label="Population" value={fmtNumber(pop)} />
          <Stat label="Employment rate" value={`${emp.toFixed(1)}%`} />
          <Stat label="Median weekly pay" value={`£${fmtNumber(pay)}`} />
          <Stat label="Growth index" value={`${stat.growthIndex.toFixed(2)}×`} sub="vs UK average" />
        </div>

        <div className="profile-grid" style={{ marginTop: 18 }}>
          <Card>
            <CardHeader subtitle="Nomis (live, latest period)" title="Economic indicators" />
            <CardBody>
              <dl className="detail-list">
                <div>
                  <dt>Population</dt>
                  <dd className="mono">{fmtNumber(pop)}</dd>
                </div>
                <div>
                  <dt>Employment rate</dt>
                  <dd className="mono">{emp.toFixed(1)}%</dd>
                </div>
                <div>
                  <dt>Economic activity</dt>
                  <dd className="mono">{(live?.economicActivityRate ?? stat.economicActivityRate).toFixed(1)}%</dd>
                </div>
                <div>
                  <dt>Median weekly pay</dt>
                  <dd className="mono">£{fmtNumber(pay)}</dd>
                </div>
              </dl>
              <div className="source">
                <span className="source__dot">●</span> Source · Nomis / ONS regional indicators
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader subtitle="Explore" title="Industries in this region" />
            <CardBody>
              <div className="sector-list">
                {FEATURED_SECTORS.map((s) => (
                  <Link className="sector" key={s} href={`/industry/${slugify(s)}`} style={{ textDecoration: "none" }}>
                    <div className="sector__top">
                      <span className="sector__name">{s}</span>
                      <Icon name="arrowRight" size={14} color="var(--accent)" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div style={{ marginTop: 18 }}>
          <Card>
            <CardHeader subtitle="Live · last 90 days" title={`Recently registered in ${stat.region}`} action={<Badge tone="pos" dot>Companies House</Badge>} />
            <CardBody flush>
              <div className="table-scroll"><table className="data-table data-table--full">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Sector</th>
                    <th className="num">Incorporated</th>
                    <th>Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length ? (
                    recent.map((c) => (
                      <tr key={c.number}>
                        <td>
                          <Link href={`/company/${c.number}`} className="cell-co" style={{ textDecoration: "none" }}>
                            <CompanyAvatar name={c.name} size="sm" />
                            <div>
                              <div className="cell-co__name">{c.name}</div>
                              <div className="cell-co__no">{c.number}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="muted">{c.classification?.sector ?? "—"}</td>
                        <td className="num mono">{c.incorporated ? fmtDate(c.incorporated) : "—"}</td>
                        <td>
                          <FactualTags incorporated={c.incorporated} sector={c.classification?.sector} sicCodes={c.sicCodes} status={c.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="empty-row">
                      <td colSpan={4}>No recent companies in the sample window for this region.</td>
                    </tr>
                  )}
                </tbody>
              </table></div>
            </CardBody>
          </Card>
        </div>

        <PublicCta
          title={`Track new companies in ${stat.region}`}
          sub="Create a free account to read a full intelligence report, or upgrade for unlimited reports, alerts and exports."
        />
      </div>
    </PublicShell>
  );
}
