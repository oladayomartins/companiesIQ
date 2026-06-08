// PUBLIC city landing page — an indexable page per major UK city, surfacing
// companies registered there plus the regional economic context.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardHeader, CardBody, Stat, Badge, Icon, CompanyAvatar } from "@/components/ds";
import { FactualTags } from "@/components/app/Tags";
import { REGION_STATS } from "@/lib/ons";
import { explore, type EnrichedResult } from "@/lib/data";
import { isoDaysAgo } from "@/lib/companies-house";
import { fmtNumber, fmtDate } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { FEATURED_SECTORS } from "@/lib/sic";
import { CITIES, cityForSlug } from "@/lib/cities";
import { PublicShell, PublicCta } from "@/components/public/PublicShell";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export function generateStaticParams() {
  return CITIES.map((c) => ({ city: slugify(c.name) }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const c = cityForSlug(city);
  if (!c) return { title: "City" };
  const desc = `Companies registered in ${c.name}, ${c.region}. Browse newly incorporated ${c.name} businesses with live data from Companies House, plus regional economic context.`;
  return {
    title: `Companies in ${c.name}`,
    description: desc,
    alternates: { canonical: `/city/${city}` },
    openGraph: { title: `Companies in ${c.name}`, description: desc, url: `${SITE_URL}/city/${city}`, type: "website" },
  };
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = cityForSlug(slug);
  if (!city) notFound();
  const region = REGION_STATS[city.region];

  let recent: EnrichedResult[] = [];
  try {
    const r = await explore({ location: city.name, incorporatedFrom: isoDaysAgo(90), incorporatedTo: isoDaysAgo(0), status: ["active"], size: 100 });
    recent = r.results.slice(0, 10);
  } catch {
    recent = [];
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Cities", item: `${SITE_URL}/city` },
      { "@type": "ListItem", position: 2, name: city.name, item: `${SITE_URL}/city/${slug}` },
    ],
  };

  return (
    <PublicShell>
      <JsonLd data={breadcrumb} />
      <div className="screen profile">
        <Link className="back" href="/city">
          <Icon name="arrowRight" size={15} style={{ transform: "rotate(180deg)" }} /> All cities
        </Link>

        <div className="screen-head">
          <div>
            <div className="app-eyebrow">UK city company data</div>
            <h1 className="screen-title">Companies in {city.name}</h1>
          </div>
          <Link href={`/market/${slugify(city.region)}`} style={{ textDecoration: "none" }}>
            <Badge tone="neutral" dot>
              {city.region}
            </Badge>
          </Link>
        </div>

        <p className="public-lede">
          Newly registered companies in {city.name}, with the wider {city.region} economic context. Open any company for
          its full intelligence report.
        </p>

        {region ? (
          <div className="profile-kpis">
            <Stat label="Region" value={city.region} />
            <Stat label="Employment rate" value={`${region.employmentRate.toFixed(1)}%`} sub={`${city.region} (regional)`} />
            <Stat label="Median weekly pay" value={`£${fmtNumber(region.medianWeeklyPay)}`} sub="regional" />
            <Stat label="Growth index" value={`${region.growthIndex.toFixed(2)}×`} sub="vs UK average" />
          </div>
        ) : null}

        <div style={{ marginTop: 18 }}>
          <Card>
            <CardHeader subtitle="Live · last 90 days" title={`Recently registered in ${city.name}`} action={<Badge tone="pos" dot>Companies House</Badge>} />
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
                      <td colSpan={4}>No recent companies found for {city.name} in the sample window.</td>
                    </tr>
                  )}
                </tbody>
              </table></div>
            </CardBody>
          </Card>
        </div>

        <div style={{ marginTop: 18 }}>
          <Card>
            <CardHeader subtitle="Explore" title="Industries to explore" />
            <CardBody>
              <div className="signal-chips">
                {FEATURED_SECTORS.map((s) => (
                  <Link key={s} href={`/industry/${slugify(s)}`} className="signal-chip">
                    {s}
                  </Link>
                ))}
                <Link href={`/market/${slugify(city.region)}`} className="signal-chip">
                  {city.region} market →
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>

        <PublicCta
          title={`Track new companies in ${city.name}`}
          sub="Create a free account to read a full intelligence report, or upgrade for unlimited reports, alerts and exports."
        />
      </div>
    </PublicShell>
  );
}
