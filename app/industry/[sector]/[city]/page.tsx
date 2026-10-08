// PUBLIC sector × city page — the programmatic long-tail layer, e.g.
// /industry/construction/manchester → "New construction companies in
// Manchester". Populated with REAL live companies from the register.
//
// Indexation is deterministic (see lib/sector-city.ts): only curated PRIORITY
// combos are indexable + sitemapped + internally linked; every other valid
// combo still renders real data but is robots:noindex,follow and unadvertised.
// isPriorityCombo() is the single source of truth, so the sitemap and the
// robots tag can never contradict each other.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardHeader, CardBody, Stat, Badge, Icon, CompanyAvatar } from "@/components/ds";
import { FactualTags } from "@/components/app/Tags";
import { REGION_STATS } from "@/lib/ons";
import { classifySic, FEATURED_SECTORS } from "@/lib/sic";
import { explore, type EnrichedResult } from "@/lib/data";
import { isoDaysAgo } from "@/lib/companies-house";
import { fmtNumber, fmtDelta, fmtDate } from "@/lib/format";
import { slugify } from "@/lib/slug";
import {
  sectorForSlug,
  cityForSlug,
  isPriorityCombo,
  priorityCitiesFor,
  priorityCombos,
  RECENT_WINDOW_DAYS,
} from "@/lib/sector-city";
import { PublicShell, PublicCta } from "@/components/public/PublicShell";
import { marketSearchHref } from "@/lib/market-link";
import { FreeAlertForm } from "@/components/FreeAlertForm";
import { ALERT_REGIONS, ALERT_SECTORS } from "@/lib/alert-options";
import { getMarketSummary, getNewestInMarket, type MarketSummary } from "@/lib/market-summary";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

// Pre-render only the curated priority combos; the rest of the matrix renders
// on demand (ISR) and is noindex.
export function generateStaticParams() {
  return priorityCombos().map((c) => ({ sector: c.sectorSlug, city: c.citySlug }));
}

// One live pull, reused by generateMetadata and the page render. Identical
// params → deduped by the Companies House fetch cache within a request.
async function recentInSectorCity(sectorLabel: string, cityName: string): Promise<EnrichedResult[]> {
  try {
    const r = await explore({
      location: cityName,
      sector: sectorLabel,
      incorporatedFrom: isoDaysAgo(RECENT_WINDOW_DAYS),
      incorporatedTo: isoDaysAgo(0),
      status: ["active"],
      size: 100,
    });
    return r.results;
  } catch {
    return [];
  }
}

/** Count phrased for copy: caps read as "100+" since the sample tops out at 100. */
function countLabel(n: number): string {
  return n >= 100 ? "100+" : String(n);
}

/** Snippet from the live counts — fitted to ~160 chars by dropping clauses. */
function describeMarket(sector: string, city: string, m: MarketSummary): string {
  const lead = `${fmtNumber(m.active)} active ${sector.toLowerCase()} companies are registered in ${city}`;
  const options = [
    `${lead}: ${fmtNumber(m.new30)} formed in the last 30 days, ${fmtNumber(m.new12m)} in the past year. See the newest, live from Companies House.`,
    `${lead}, ${fmtNumber(m.new30)} formed in the last 30 days. See the newest, live from Companies House.`,
    `${lead}. See the newest, live from Companies House.`,
  ];
  return options.find((d) => d.length <= 160) ?? options[options.length - 1];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sector: string; city: string }>;
}): Promise<Metadata> {
  const { sector, city } = await params;
  const stat = sectorForSlug(sector);
  const c = cityForSlug(city);
  if (!stat || !c) return {};

  const path = `/industry/${sector}/${city}`;
  const indexable = isPriorityCombo(sector, city);

  // Search Console (Oct 2026): people search for the market ("construction
  // companies birmingham"), not only for new formations — so the title names
  // the market and carries the live count when it fits Google's ~60 chars.
  const base = `${stat.sector} companies in ${c.name}`;
  let title = base;
  let desc: string;
  const m = indexable ? await getMarketSummary({ sector: stat.sector, place: c.name }) : null;
  if (m) {
    if (base.length <= 38) title = `${base} (${fmtNumber(m.active)} active)`;
    desc = describeMarket(stat.sector, c.name, m);
  } else if (indexable) {
    const n = (await recentInSectorCity(stat.sector, c.name)).length;
    desc = `${countLabel(n)} ${stat.sector.toLowerCase()} companies registered in ${c.name}, ${c.region} in the last 12 months. See the newest, with directors, SIC codes and incorporation dates — live from Companies House.`;
  } else {
    desc = `Newly registered ${stat.sector.toLowerCase()} companies in ${c.name}, ${c.region}, live from Companies House.`;
  }

  return {
    title,
    description: desc,
    // Only set a canonical on indexable pages; noindex + canonical is a mixed
    // signal, so noindex pages get robots only.
    alternates: indexable ? { canonical: path } : undefined,
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: { title, description: desc, url: `${SITE_URL}${path}`, type: "website" },
  };
}

export default async function SectorCityPage({
  params,
}: {
  params: Promise<{ sector: string; city: string }>;
}) {
  const { sector: sectorSlug, city: citySlug } = await params;
  const stat = sectorForSlug(sectorSlug);
  const city = cityForSlug(citySlug);
  if (!stat || !city) notFound();

  const region = REGION_STATS[city.region];
  // Real register numbers (sector queried as its tracked SIC codes, so the
  // totals are Companies House's own — not a 100-row sample). Falls back to
  // the sampled pull if Companies House doesn't answer.
  const [market, newestPage] = await Promise.all([
    getMarketSummary({ sector: stat.sector, place: city.name }),
    getNewestInMarket({ sector: stat.sector, place: city.name }),
  ]);
  const all = newestPage?.results ?? (await recentInSectorCity(stat.sector, city.name));
  const recent = all.slice(0, 12);
  const cityCount = market?.new12m ?? all.length;
  const exact = !!market;

  // City-specific differentiator: the leading activity among this city's recent
  // formations in the sector (varies city to city, unlike the sector-UK KPIs).
  const sicTally = new Map<string, number>();
  for (const r of all) {
    const s = r.sicCodes[0];
    if (s) sicTally.set(s, (sicTally.get(s) || 0) + 1);
  }
  const topSic = [...sicTally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const topActivity = topSic ? classifySic(topSic).category : null;

  // Cross-links stay within the indexable priority set so we don't flood crawl
  // with links to noindex permutations.
  const otherCities = priorityCitiesFor(sectorSlug).filter((c) => c.name !== city.name);
  const otherSectors = FEATURED_SECTORS.filter((s) => s !== stat.sector);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Industries", item: `${SITE_URL}/industry` },
      { "@type": "ListItem", position: 2, name: stat.sector, item: `${SITE_URL}/industry/${sectorSlug}` },
      { "@type": "ListItem", position: 3, name: city.name, item: `${SITE_URL}/industry/${sectorSlug}/${citySlug}` },
    ],
  };

  // Visible FAQ (helps users); FAQPage schema deliberately NOT emitted on these
  // programmatic pages — FAQ rich results are gov/health-only, so templated
  // schema across the matrix is zero-benefit and a scaled-markup smell.
  const faqs: [string, string][] = [
    ...(market
      ? ([
          [
            `How many ${stat.sector.toLowerCase()} companies are there in ${city.name}?`,
            `There are ${fmtNumber(market.active)} active ${stat.sector.toLowerCase()} companies with a registered office in ${city.name} on the Companies House register, of which ${fmtNumber(market.new30)} were incorporated in the last 30 days and ${fmtNumber(market.new12m)} in the last 12 months. The count covers ${market.sicCodes} tracked ${stat.sector} SIC codes and is updated from the live register.`,
          ],
        ] as [string, string][])
      : []),
    [
      `How can I find new ${stat.sector.toLowerCase()} companies in ${city.name}?`,
      `CompaniesIQ lists newly incorporated ${stat.sector.toLowerCase()} companies in ${city.name} within 24 hours of them appearing on the Companies House register. Review the recent formations above, open any company for its full report, or filter and export the list.`,
    ],
    [
      `Why track newly registered ${stat.sector.toLowerCase()} companies in ${city.name}?`,
      `New companies are making their first decisions about suppliers, services and finance. Reaching ${stat.sector.toLowerCase()} businesses in ${city.name} in their first weeks — before competitors — is one of the strongest uses of formation data, whether for sales, recruitment or professional services.`,
    ],
    [
      `Can I get alerts for new ${stat.sector.toLowerCase()} companies in ${city.name}?`,
      `Yes. Set up a watchlist for ${stat.sector.toLowerCase()} formations in the ${city.region} region and CompaniesIQ will alert you as new companies incorporate, plus when tracked companies file, appoint directors or change status.`,
    ],
  ];

  // The newest companies as an ItemList — the page IS a list of companies.
  const itemList = recent.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `Newest ${stat.sector.toLowerCase()} companies in ${city.name}`,
        numberOfItems: recent.length,
        itemListElement: recent.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/company/${c.number}`,
          name: c.name,
        })),
      }
    : null;

  return (
    <PublicShell>
      <JsonLd data={itemList ? [breadcrumb, itemList] : breadcrumb} />
      <div className="screen profile">
        <Link className="back" href={`/industry/${sectorSlug}`}>
          <Icon name="arrowRight" size={15} style={{ transform: "rotate(180deg)" }} /> All {stat.sector} companies
        </Link>

        <div className="screen-head">
          <div>
            <div className="app-eyebrow">
              {stat.sector} · {city.name} · live register
            </div>
            <h1 className="screen-title">
              {stat.sector} companies in {city.name}
            </h1>
          </div>
          <Link href={`/city/${slugify(city.name)}`} style={{ textDecoration: "none" }}>
            <Badge tone="neutral" dot>
              {city.name}, {city.region}
            </Badge>
          </Link>
        </div>

        <p className="public-lede">
          {market ? (
            <>
              There are <strong>{fmtNumber(market.active)}</strong> active {stat.sector.toLowerCase()} companies with a
              registered office in {city.name}. <strong>{fmtNumber(market.new30)}</strong> formed in the last 30 days and{" "}
              <strong>{fmtNumber(market.new12m)}</strong> in the past year
              {topActivity ? (
                <>
                  , most commonly in <strong>{topActivity.toLowerCase()}</strong>
                </>
              ) : null}
              . The newest are below, live from the Companies House register — open any company for its full report.
            </>
          ) : cityCount > 0 ? (
            <>
              <strong>{countLabel(cityCount)}</strong> {stat.sector.toLowerCase()} companies have registered in{" "}
              {city.name} in the last 12 months
              {topActivity ? (
                <>
                  , most commonly in <strong>{topActivity.toLowerCase()}</strong>
                </>
              ) : null}
              . Below are the newest, drawn live from the Companies House register — open any company for its full
              intelligence report.
            </>
          ) : (
            <>
              Newly registered {stat.sector.toLowerCase()} companies in {city.name}, drawn live from the Companies House
              register, with {city.region} economic context.
            </>
          )}
        </p>

        {market ? (
          // Facts only — every line is a number on this page or the register.
          <aside className="blog-takeaways" aria-labelledby="key-facts">
            <h2 className="blog-takeaways__title" id="key-facts">
              Key facts
            </h2>
            <ul className="blog-takeaways__list">
              <li>
                {fmtNumber(market.active)} active {stat.sector.toLowerCase()} companies have a registered office in{" "}
                {city.name}.
              </li>
              <li>
                {fmtNumber(market.new30)} were incorporated in the last 30 days, and {fmtNumber(market.new12m)} in the
                last 12 months.
              </li>
              {topActivity ? (
                <li>
                  The most common activity among recent formations is {topActivity.toLowerCase()}.
                </li>
              ) : null}
              {region ? (
                <li>
                  {city.region}&rsquo;s new-business growth index is {region.growthIndex.toFixed(2)}× the UK average
                  {region.growthIndex >= 1.05 ? " — ahead of the country" : region.growthIndex <= 0.95 ? " — behind the country" : " — in line with the country"}.
                </li>
              ) : null}
            </ul>
          </aside>
        ) : null}

        <div className="profile-kpis">
          {market ? (
            <>
              <Stat label={`Active in ${city.name}`} value={fmtNumber(market.active)} sub={`${stat.sector.toLowerCase()} companies`} />
              <Stat label="New · last 30 days" value={fmtNumber(market.new30)} sub="incorporated" />
              <Stat label="New · last 12 months" value={fmtNumber(market.new12m)} sub="incorporated" />
            </>
          ) : (
            <Stat label={`New in ${city.name} (12m)`} value={countLabel(cityCount)} sub={`${stat.sector.toLowerCase()} formations`} />
          )}
          <Stat label={`${stat.sector} (UK)`} value={fmtNumber(stat.businesses)} sub="active companies" delta={fmtDelta(stat.annualGrowth)} />
          {!market && region ? <Stat label={`${city.region} growth`} value={`${region.growthIndex.toFixed(2)}×`} sub="vs UK average" /> : null}
          {!market && region ? <Stat label="Median weekly pay" value={`£${fmtNumber(region.medianWeeklyPay)}`} sub={`${city.region} (regional)`} /> : null}
        </div>
        {exact ? (
          <p className="mkt__note" style={{ marginTop: 8 }}>
            Counts are live Companies House totals for {market!.sicCodes} tracked {stat.sector} SIC codes, by registered-office
            address in {city.name} — where companies are registered, not necessarily where they trade.
          </p>
        ) : null}

        <div style={{ marginTop: 18 }}>
          <Card>
            <CardHeader
              subtitle={`Live · newest active companies · last ${Math.round(RECENT_WINDOW_DAYS / 30)} months`}
              title={`Newest ${stat.sector.toLowerCase()} companies in ${city.name}`}
              action={<Badge tone="pos" dot>Companies House</Badge>}
            />
            <CardBody flush>
              <div className="table-scroll"><table className="data-table data-table--full">
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
                    recent.map((c) => (
                      <tr key={c.number}>
                        <td>
                          <Link href={`/company/${c.number}`} className="cell-co" style={{ textDecoration: "none" }}>
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
                    ))
                  ) : (
                    <tr className="empty-row">
                      <td colSpan={4}>
                        No newly registered {stat.sector.toLowerCase()} companies found in {city.name} in this window.
                        Browse all <Link href={`/industry/${sectorSlug}`}>{stat.sector} companies</Link> or{" "}
                        <Link href={`/city/${slugify(city.name)}`}>companies in {city.name}</Link>.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table></div>
            </CardBody>
          </Card>
        </div>

        <div style={{ marginTop: 18 }}>
          <Card>
            <CardHeader subtitle="Prospect list" title={`Turn ${city.name} ${stat.sector.toLowerCase()} into a prospect list`} />
            <CardBody>
              <p className="public-lede" style={{ margin: "0 0 12px" }}>
                Search the full list — filter by age and status, sort newest first, and save or export it with a paid
                plan — or get the new ones emailed to you every week, free.
              </p>
              <div className="mkt__actions" style={{ marginTop: 0, marginBottom: 14 }}>
                <Link href={marketSearchHref({ sector: stat.sector, place: city.name, from: `industry:${sectorSlug}/${slugify(city.name)}` })} className="signal-chip">
                  Search all {stat.sector.toLowerCase()} companies in {city.name} →
                </Link>
                <Link href={marketSearchHref({ sector: stat.sector, place: city.name, incorporated: "12m", from: `industry:${sectorSlug}/${slugify(city.name)}` })} className="signal-chip">
                  Formed in the last 12 months →
                </Link>
              </div>
              <FreeAlertForm
                compact
                sector={ALERT_SECTORS.some((o) => o.value === stat.sector) ? stat.sector : ""}
                region={ALERT_REGIONS.some((o) => o.value === city.region) ? city.region : ""}
                source={`industry-city:${sectorSlug}/${citySlug}`}
              />
            </CardBody>
          </Card>
        </div>

        <div className="profile-grid" style={{ marginTop: 18 }}>
          {otherCities.length ? (
            <Card>
              <CardHeader subtitle="Same sector" title={`${stat.sector} in other cities`} />
              <CardBody>
                <div className="signal-chips">
                  {otherCities.map((c) => (
                    <Link key={c.name} href={`/industry/${sectorSlug}/${slugify(c.name)}`} className="signal-chip">
                      {c.name}
                    </Link>
                  ))}
                  <Link href={`/industry/${sectorSlug}`} className="signal-chip">
                    All {stat.sector} →
                  </Link>
                </div>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader subtitle="Same city" title={`Other industries in ${city.name}`} />
            <CardBody>
              <div className="signal-chips">
                {otherSectors.map((s) => (
                  <Link key={s} href={`/industry/${slugify(s)}/${slugify(city.name)}`} className="signal-chip">
                    {s}
                  </Link>
                ))}
                <Link href={`/city/${slugify(city.name)}`} className="signal-chip">
                  All of {city.name} →
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="public-faq" style={{ marginTop: 18 }}>
          <Card>
            <CardHeader subtitle="FAQ" title={`New ${stat.sector.toLowerCase()} companies in ${city.name}`} />
            <CardBody>
              <div className="faq-grid">
                {faqs.map(([q, a]) => (
                  <div className="faq-item" key={q}>
                    <h3 className="faq-item__q">{q}</h3>
                    <p className="faq-item__a">{a}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <PublicCta
          title={`Track new ${stat.sector.toLowerCase()} companies in ${city.name}`}
          sub="Create a free account to read a full intelligence report, or upgrade for unlimited reports, alerts and exports across every UK company."
          ctaLabel={`Find ${stat.sector.toLowerCase()} companies in ${city.name}`}
          ctaHref={marketSearchHref({ sector: stat.sector, place: city.name, from: `industry:${sectorSlug}/${slugify(city.name)}` })}
        />
      </div>
    </PublicShell>
  );
}
