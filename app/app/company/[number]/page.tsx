import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCompanyBundle } from "@/lib/data";
import { buildIntelligenceReport } from "@/lib/analytics";
import { getSimilarCompanies } from "@/lib/similar";
import { getRegionLive } from "@/lib/nomis";
import { enrichCompany, type CompanyEnrichment } from "@/lib/enrichment";
import { CompanyProfile } from "@/components/app/CompanyProfile";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }): Promise<Metadata> {
  const { number } = await params;
  const bundle = await getCompanyBundle(number);
  return { title: bundle ? `${bundle.company.name} · CompaniesIQ` : "Company · CompaniesIQ" };
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

  return (
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
  );
}
