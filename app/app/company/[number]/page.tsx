import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCompanyBundle } from "@/lib/data";
import { buildIntelligenceReport } from "@/lib/analytics";
import { getRegionLive } from "@/lib/nomis";
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

  const economicLive = await getRegionLive(bundle.company.geo?.region);
  const report = buildIntelligenceReport(bundle.company, economicLive);

  return (
    <CompanyProfile
      company={bundle.company}
      officers={bundle.officers}
      filings={bundle.filings}
      charges={bundle.charges}
      pscs={bundle.pscs}
      report={report}
      live={bundle.live}
    />
  );
}
