// Founder Growth Report — the DigitWarehouse QR funnel.
// PUBLIC, standalone (no app chrome): cold founders who scanned a letter aren't
// logged in. Same data engine as the standard report (/app/company/[number]),
// different, conversion-focused presentation. ?source=<partner> tags the QR
// campaign; ?verified=1 marks a confirmed lead.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCompanyBundle } from "@/lib/data";
import { buildIntelligenceReport } from "@/lib/analytics";
import { getSimilarCompanies } from "@/lib/similar";
import { getRegionLive } from "@/lib/nomis";
import { enrichCompany, type CompanyEnrichment } from "@/lib/enrichment";
import { getCompetitorPresence } from "@/lib/enrichment/competitors";
import { recordFunnelEvent } from "@/lib/leads";
import { getPartner } from "@/lib/partners";
import { GrowthReport } from "@/components/app/GrowthReport";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }): Promise<Metadata> {
  const { number } = await params;
  const bundle = await getCompanyBundle(number);
  return {
    title: bundle ? `${bundle.company.name} — Growth Report` : "Growth Report",
    robots: { index: false }, // funnel pages aren't for search indexing
  };
}

export default async function GrowthReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ source?: string; verified?: string }>;
}) {
  const { number } = await params;
  const { source, verified } = await searchParams;
  const bundle = await getCompanyBundle(number);
  if (!bundle) notFound();

  const c = bundle.company;
  const partner = getPartner(source);

  const economicLive = await getRegionLive(c.geo?.region).catch(() => null);
  const report = buildIntelligenceReport(c, economicLive);

  const [similar, subject] = await Promise.all([
    getSimilarCompanies(c.number, c.sicCodes[0], c.geo?.region),
    enrichCompany({
      number: c.number,
      name: c.name,
      locality: c.geo?.locality ?? c.address?.locality,
      postcode: c.address?.postcode ?? c.geo?.postcode,
    }).catch(() => null as CompanyEnrichment | null),
  ]);
  const competitors = await getCompetitorPresence(similar).catch(() => null);

  await recordFunnelEvent(c.number, source ? "scan" : "view", source);

  return (
    <GrowthReport
      data={{
        number: c.number,
        name: c.name,
        sector: report.overview.sector,
        region: report.local.region,
        industry: {
          businesses: report.industry.businesses,
          newLastYear: report.industry.newLastYear,
          annualGrowth: report.industry.annualGrowth,
          fiveYearSurvival: report.survival.fiveYear,
        },
        local: {
          inSameIndustry: report.local.inSameIndustry,
          newEntrants: report.local.newEntrants,
          density: report.local.density,
        },
        subject: subject
          ? {
              website: !!subject.websiteUrl,
              gbp: subject.gbpPresent === true,
              reviewCount: subject.reviewCount,
              reviewRating: subject.reviewRating,
              measured: subject.matchConfidence === "high",
            }
          : null,
        competitors,
      }}
      partner={partner}
      source={source ?? null}
      verified={verified === "1"}
    />
  );
}
