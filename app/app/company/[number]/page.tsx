import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCompanyBundle, explore } from "@/lib/data";
import { buildIntelligenceReport, type SimilarCompany } from "@/lib/analytics";
import { getRegionLive } from "@/lib/nomis";
import { CompanyProfile } from "@/components/app/CompanyProfile";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }): Promise<Metadata> {
  const { number } = await params;
  const bundle = await getCompanyBundle(number);
  return { title: bundle ? `${bundle.company.name} · CompaniesIQ` : "Company · CompaniesIQ" };
}

/**
 * Active companies sharing the subject's primary SIC, excluding itself.
 * Same-region peers are surfaced first; if too few, we fill with national
 * same-SIC companies so the section stays useful (region shown per row).
 */
async function getSimilarCompanies(number: string, sic: string | undefined, region: string | undefined): Promise<SimilarCompany[]> {
  if (!sic) return [];
  try {
    const r = await explore({ sicCodes: [sic], status: ["active"], size: 60 });
    const others = r.results.filter((x) => x.number !== number);
    const inRegion = region && region !== "Unknown" ? others.filter((x) => x.region === region) : [];
    const rest = others.filter((x) => !inRegion.includes(x));
    return [...inRegion, ...rest]
      .slice(0, 6)
      .map((x) => ({ number: x.number, name: x.name, sicCode: x.sicCodes[0], region: x.region, incorporated: x.incorporated, status: x.status }));
  } catch {
    return [];
  }
}

export default async function CompanyPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const bundle = await getCompanyBundle(number);
  if (!bundle) notFound();

  const [economicLive, similar] = await Promise.all([
    getRegionLive(bundle.company.geo?.region),
    getSimilarCompanies(bundle.company.number, bundle.company.sicCodes[0], bundle.company.geo?.region),
  ]);
  const report = buildIntelligenceReport(bundle.company, economicLive);

  return (
    <CompanyProfile
      company={bundle.company}
      officers={bundle.officers}
      filings={bundle.filings}
      charges={bundle.charges}
      pscs={bundle.pscs}
      report={report}
      similar={similar}
      live={bundle.live}
    />
  );
}
