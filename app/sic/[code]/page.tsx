// PUBLIC SIC-code page — /sic/62012 → "SIC Code 62012: Software development".
// Targets the "companies by SIC code" / "SIC code search" cluster. Bounded to
// the curated CODE_CATEGORY set (see lib/sic.ts) so there's no thin-content or
// junk-URL risk, and each page carries a real live company count + sample.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardHeader, CardBody, Stat, Badge, Icon, CompanyAvatar } from "@/components/ds";
import { FactualTags } from "@/components/app/Tags";
import { classifySic, sicCategory, CURATED_SIC_CODES } from "@/lib/sic";
import { explore, type EnrichedResult } from "@/lib/data";
import { countCompanies, isoDaysAgo } from "@/lib/companies-house";
import { fmtNumber, fmtDate } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { PublicShell, PublicCta } from "@/components/public/PublicShell";
import { RelatedGuides } from "@/components/RelatedGuides";
import { guidesForSic } from "@/lib/guides";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export function generateStaticParams() {
  return CURATED_SIC_CODES.map((code) => ({ code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const category = sicCategory(code);
  if (!category) return {};
  const cls = classifySic(code);
  const path = `/sic/${code}`;
  const title = `SIC Code ${code}: ${category}`;
  const desc = `SIC code ${code} means "${category}" (${cls.sector}). See what the code covers and browse UK companies registered under SIC ${code}, with live data from Companies House.`;
  return {
    title,
    description: desc,
    alternates: { canonical: path },
    openGraph: { title, description: desc, url: `${SITE_URL}${path}`, type: "website" },
  };
}

export default async function SicCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const category = sicCategory(code);
  if (!category) notFound();
  const cls = classifySic(code);

  let total = 0;
  let recent: EnrichedResult[] = [];
  try {
    [total, recent] = await Promise.all([
      countCompanies({ sicCodes: [code], status: ["active"] }),
      explore({ sicCodes: [code], incorporatedFrom: isoDaysAgo(365), incorporatedTo: isoDaysAgo(0), status: ["active"], size: 12 }).then((r) => r.results),
    ]);
  } catch {
    total = 0;
    recent = [];
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "SIC codes", item: `${SITE_URL}/sic` },
      { "@type": "ListItem", position: 2, name: `SIC ${code}`, item: `${SITE_URL}/sic/${code}` },
    ],
  };
  // Visible FAQ only — FAQPage schema deliberately omitted (FAQ rich results
  // are gov/health-only, so templated schema across the SIC set is zero-benefit).
  const faqs: [string, string][] = [
    [
      `What does SIC code ${code} mean?`,
      `SIC code ${code} is the UK Standard Industrial Classification for "${category}". It sits in the "${cls.division}" division and the ${cls.sector} sector. Companies choose one or more SIC codes when they incorporate to describe what they do.`,
    ],
    [
      `How do I find companies with SIC code ${code}?`,
      `Browse the recently registered companies under SIC ${code} below, or use CompaniesIQ to filter all UK companies by SIC code, location and incorporation date and export the results.`,
    ],
  ];

  return (
    <PublicShell>
      <JsonLd data={breadcrumb} />
      <div className="screen profile">
        <Link className="back" href="/sic">
          <Icon name="arrowRight" size={15} style={{ transform: "rotate(180deg)" }} /> All SIC codes
        </Link>

        <div className="screen-head">
          <div>
            <div className="app-eyebrow">SIC code · {cls.sector}</div>
            <h1 className="screen-title">
              SIC {code}: {category}
            </h1>
          </div>
          <Link href={`/industry/${slugify(cls.sector)}`} style={{ textDecoration: "none" }}>
            <Badge tone="neutral" dot>
              {cls.sector}
            </Badge>
          </Link>
        </div>

        <p className="public-lede">
          SIC code <span className="mono">{code}</span> covers <strong>{category}</strong> — part of the {cls.division}{" "}
          division. Companies pick this code when they incorporate to describe their activity. Browse UK companies
          registered under it below.
        </p>

        <div className="profile-kpis">
          <Stat label="SIC code" value={code} sub="UK SIC 2007" />
          <Stat label="Active companies" value={fmtNumber(total)} sub="with this code" />
          <Stat label="Division" value={cls.division} />
          <Stat label="Sector" value={cls.sector} />
        </div>

        <div style={{ marginTop: 18 }}>
          <Card>
            <CardHeader
              subtitle="Live · last 12 months"
              title={`Recently registered under SIC ${code}`}
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
                              <div className="cell-co__no">{c.number}</div>
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
                      <td colSpan={4}>No recently registered companies found under SIC {code} in this window.</td>
                    </tr>
                  )}
                </tbody>
              </table></div>
            </CardBody>
          </Card>
        </div>

        <div className="public-faq" style={{ marginTop: 18 }}>
          <Card>
            <CardHeader subtitle="FAQ" title={`SIC code ${code}`} />
            <CardBody>
              <div className="faq-grid">
                {faqs.map(([q, a]) => (
                  <div className="faq-item" key={q}>
                    <h3 className="faq-item__q">{q}</h3>
                    <p className="faq-item__a">{a}</p>
                  </div>
                ))}
              </div>
              <div className="source" style={{ marginTop: 14 }}>
                <span className="source__dot">●</span> New to SIC codes? Read{" "}
                <Link href="/blog/sic-codes-explained">SIC codes explained</Link>.
              </div>
            </CardBody>
          </Card>
        </div>

        <RelatedGuides guides={guidesForSic()} title="Understand the register" />

        <PublicCta
          title={`Find companies with SIC code ${code}`}
          sub="Create a free account to filter UK companies by SIC code, location and incorporation date — and export the list."
          ctaLabel={`Find SIC ${code} companies`}
        />
      </div>
    </PublicShell>
  );
}
