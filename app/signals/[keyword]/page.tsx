// PUBLIC signal landing page — an indexable page per commercial theme
// (AI, Fintech, Construction…), surfacing live UK companies matching the theme.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardHeader, CardBody, Badge, Icon, CompanyAvatar } from "@/components/ds";
import { FactualTags } from "@/components/app/Tags";
import { search, type EnrichedResult } from "@/lib/data";
import { SIGNALS, signalForSlug } from "@/lib/signals";
import { fmtDate } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { PublicShell, PublicCta } from "@/components/public/PublicShell";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export function generateStaticParams() {
  return SIGNALS.map((s) => ({ keyword: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ keyword: string }> }): Promise<Metadata> {
  const { keyword } = await params;
  const signal = signalForSlug(keyword);
  if (!signal) return { title: "Signal" };
  const desc = `${signal.blurb} Discover newly registered ${signal.key} companies in the UK, with live data from Companies House.`;
  return {
    title: `${signal.key} companies in the UK`,
    description: desc,
    alternates: { canonical: `/signals/${signal.slug}` },
    openGraph: { title: `${signal.key} companies in the UK`, description: desc, url: `${SITE_URL}/signals/${signal.slug}`, type: "website" },
  };
}

export default async function SignalPage({ params }: { params: Promise<{ keyword: string }> }) {
  const { keyword } = await params;
  const signal = signalForSlug(keyword);
  if (!signal) notFound();

  let results: EnrichedResult[] = [];
  let total = 0;
  try {
    const r = await search(signal.term);
    results = r.results.slice(0, 10);
    total = r.total;
  } catch {
    results = [];
  }

  const related = SIGNALS.filter((s) => s.slug !== signal.slug).slice(0, 8);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Signals", item: `${SITE_URL}/signals` },
      { "@type": "ListItem", position: 2, name: signal.key, item: `${SITE_URL}/signals/${signal.slug}` },
    ],
  };

  return (
    <PublicShell>
      <JsonLd data={breadcrumb} />
      <div className="screen profile">
        <Link className="back" href="/signals">
          <Icon name="arrowRight" size={15} style={{ transform: "rotate(180deg)" }} /> All signals
        </Link>

        <div className="screen-head">
          <div>
            <div className="app-eyebrow">UK company signal</div>
            <h1 className="screen-title">{signal.key} companies</h1>
          </div>
          {total ? (
            <Badge tone="accent" dot>
              {total.toLocaleString("en-GB")}+ matches
            </Badge>
          ) : null}
        </div>

        <p className="public-lede">{signal.blurb}</p>

        <Card>
          <CardHeader subtitle="Live · Companies House" title={`Companies matching “${signal.key}”`} action={<Badge tone="pos" dot>Live</Badge>} />
          <CardBody flush>
            <div className="table-scroll"><table className="data-table data-table--full">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Sector</th>
                  <th>Region</th>
                  <th className="num">Incorporated</th>
                  <th>Tags</th>
                </tr>
              </thead>
              <tbody>
                {results.length ? (
                  results.map((c) => (
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
                      <td className="muted">{c.region ?? "—"}</td>
                      <td className="num mono">{c.incorporated ? fmtDate(c.incorporated) : "—"}</td>
                      <td>
                        <FactualTags incorporated={c.incorporated} sector={c.classification?.sector} sicCodes={c.sicCodes} status={c.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="empty-row">
                    <td colSpan={5}>No live matches available right now.</td>
                  </tr>
                )}
              </tbody>
            </table></div>
          </CardBody>
        </Card>

        <div style={{ marginTop: 22 }}>
          <div className="app-eyebrow" style={{ marginBottom: 10 }}>Related signals</div>
          <div className="signal-chips">
            {related.map((s) => (
              <Link key={s.slug} href={`/signals/${s.slug}`} className="signal-chip">
                {s.key}
              </Link>
            ))}
          </div>
        </div>

        <PublicCta
          title={`Track new ${signal.key} companies`}
          sub="Create a free account to read a full intelligence report, or upgrade for unlimited reports, alerts and exports."
        />
      </div>
    </PublicShell>
  );
}
