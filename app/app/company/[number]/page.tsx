import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCompanyBundle } from "@/lib/data";
import { buildIntelligenceReport } from "@/lib/analytics";
import { getSimilarCompanies } from "@/lib/similar";
import { getRegionLive } from "@/lib/nomis";
import { enrichCompany, type CompanyEnrichment } from "@/lib/enrichment";
import { CompanyProfile } from "@/components/app/CompanyProfile";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { fmtDate } from "@/lib/format";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }): Promise<Metadata> {
  const { number } = await params;
  const bundle = await getCompanyBundle(number);
  if (!bundle) return { title: "Company" };
  const c = bundle.company;
  const sector = c.primaryClassification?.sector;
  const region = c.geo?.region && c.geo.region !== "Unknown" ? c.geo.region : undefined;
  const desc = `${c.name} (company ${c.number})${c.incorporated ? `, incorporated ${fmtDate(c.incorporated)}` : ""}${
    sector ? ` — ${sector}` : ""
  }${region ? ` in ${region}` : ""}. Market, competitor and survival intelligence from Companies House, ONS & Nomis.`;
  return {
    title: c.name,
    description: desc,
    alternates: { canonical: `/app/company/${c.number}` },
    openGraph: { title: `${c.name} — CompaniesIQ`, description: desc, type: "profile" },
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const bundle = await getCompanyBundle(number);
  if (!bundle) notFound();

  const c = bundle.company;
  const [economicLive, similar, enrichment] = await Promise.all([
    getRegionLive(c.geo?.region),
    getSimilarCompanies(c.number, c.sicCodes[0], c.geo?.region),
    // Cache-first digital-presence enrichment for the subject company; defensive
    // so a missing key / Places error never breaks the report (→ "Not Assessed").
    enrichCompany({
      number: c.number,
      name: c.name,
      locality: c.geo?.locality ?? c.address?.locality,
      postcode: c.address?.postcode ?? c.geo?.postcode,
    }).catch(() => null as CompanyEnrichment | null),
  ]);
  const report = buildIntelligenceReport(c, economicLive);

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: c.name,
    identifier: c.number,
    url: `${SITE_URL}/app/company/${c.number}`,
    ...(c.geo?.region && c.geo.region !== "Unknown"
      ? { address: { "@type": "PostalAddress", addressRegion: c.geo.region, addressCountry: "GB" } }
      : {}),
    ...(c.incorporated ? { foundingDate: c.incorporated } : {}),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Companies", item: `${SITE_URL}/app/companies` },
      { "@type": "ListItem", position: 2, name: c.name, item: `${SITE_URL}/app/company/${c.number}` },
    ],
  };

  return (
    <>
      <JsonLd data={[orgSchema, breadcrumb]} />
      <CompanyProfile
      company={c}
      officers={bundle.officers}
      filings={bundle.filings}
      charges={bundle.charges}
      pscs={bundle.pscs}
      report={report}
      similar={similar}
      enrichment={enrichment}
      live={bundle.live}
      />
    </>
  );
}
