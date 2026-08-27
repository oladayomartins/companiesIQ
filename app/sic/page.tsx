// PUBLIC SIC code index — /sic. Explains SIC codes and lists the curated codes
// we cover, grouped by sector, each linking to its /sic/[code] page. Targets
// "SIC code search" / "SIC code database" / "companies by SIC code".
import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardHeader, CardBody } from "@/components/ds";
import { classifySic, sicCategory, CURATED_SIC_CODES } from "@/lib/sic";
import { slugify } from "@/lib/slug";
import { PublicShell, PublicCta } from "@/components/public/PublicShell";
import { RelatedGuides } from "@/components/RelatedGuides";
import { guidesForSic } from "@/lib/guides";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const PATH = "/sic";

export const metadata: Metadata = {
  title: "SIC Code Search — UK SIC codes, meanings & companies",
  description:
    "Search UK SIC 2007 codes: what each code means, the sector it belongs to, and the companies registered under it. Browse common SIC codes and find companies by SIC code with live Companies House data.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "SIC Code Search — UK SIC codes & companies",
    description: "What each UK SIC code means and the companies registered under it — live from Companies House.",
    url: `${SITE_URL}${PATH}`,
    type: "website",
  },
};

// Group the curated codes by sector for a scannable index.
function grouped(): { sector: string; codes: { code: string; category: string }[] }[] {
  const bySector = new Map<string, { code: string; category: string }[]>();
  for (const code of CURATED_SIC_CODES) {
    const category = sicCategory(code) ?? code;
    const sector = classifySic(code).sector;
    if (!bySector.has(sector)) bySector.set(sector, []);
    bySector.get(sector)!.push({ code, category });
  }
  return [...bySector.entries()]
    .map(([sector, codes]) => ({ sector, codes: codes.sort((a, b) => a.code.localeCompare(b.code)) }))
    .sort((a, b) => b.codes.length - a.codes.length);
}

export default function SicIndexPage() {
  const groups = grouped();
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ "@type": "ListItem", position: 1, name: "SIC codes", item: `${SITE_URL}${PATH}` }],
  };

  return (
    <PublicShell>
      <JsonLd data={breadcrumb} />
      <div className="screen profile">
        <div className="screen-head">
          <div>
            <div className="app-eyebrow">UK SIC 2007</div>
            <h1 className="screen-title">SIC code search</h1>
          </div>
        </div>

        <p className="public-lede">
          A SIC (Standard Industrial Classification) code describes what a UK company does. Every company picks one or
          more when it incorporates. Browse common codes below to see what each means and the companies registered under
          it — or read <Link href="/blog/sic-codes-explained">SIC codes explained</Link>.
        </p>

        {groups.map((g) => (
          <div style={{ marginTop: 18 }} key={g.sector}>
            <Card>
              <CardHeader
                subtitle={`${g.codes.length} codes`}
                title={g.sector}
                titleAs="h2"
                action={
                  <Link href={`/industry/${slugify(g.sector)}`} className="rep-head__link">
                    {g.sector} companies →
                  </Link>
                }
              />
              <CardBody>
                <div className="signal-chips">
                  {g.codes.map((c) => (
                    <Link key={c.code} href={`/sic/${c.code}`} className="signal-chip">
                      <span className="mono">{c.code}</span> · {c.category}
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        ))}

        <RelatedGuides guides={guidesForSic()} title="Understand the register" />

        <PublicCta
          title="Find companies by SIC code"
          sub="Create a free account to filter UK companies by SIC code, location and incorporation date — and export the list."
          ctaLabel="Search by SIC code"
        />
      </div>
    </PublicShell>
  );
}
