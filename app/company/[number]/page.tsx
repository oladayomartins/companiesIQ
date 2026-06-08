// PUBLIC company report — the SEO surface. Crawlable profile (overview,
// industry, location, people, filing history, basic market snapshot) with the
// deep intelligence gated behind sign-in. Logged-in users see the full report
// inline; logged-out visitors (and Googlebot) see the free preview + an
// "Unlock full intelligence" gate.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCompanyBundle } from "@/lib/data";
import { buildIntelligenceReport } from "@/lib/analytics";
import { getSimilarCompanies } from "@/lib/similar";
import { getRegionLive } from "@/lib/nomis";
import { enrichCompany, type CompanyEnrichment } from "@/lib/enrichment";
import { getCurrentUser } from "@/lib/supabase/server";
import { isPartner } from "@/lib/admin";
import { resolveReportAccess } from "@/lib/access";
import { CompanyProfile } from "@/components/app/CompanyProfile";
import { PublicReportChrome } from "@/components/report/PublicChrome";
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
    alternates: { canonical: `/company/${c.number}` },
    openGraph: { title: `${c.name} — CompaniesIQ`, description: desc, type: "profile", url: `${SITE_URL}/company/${c.number}` },
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const bundle = await getCompanyBundle(number);
  if (!bundle) notFound();

  const c = bundle.company;
  const user = await getCurrentUser();
  const access = await resolveReportAccess(user, c.number);
  const unlocked = access.unlocked;
  // Which paywall to show when locked: cold visitors get a "create free account"
  // gate; free users who've spent their monthly report get an "upgrade" gate.
  const gate = access.state === "free_quota_exceeded" ? "quota" : "anonymous";
  const signedIn = !!user;
  const partner = isPartner(user);

  const [economicLive, similar, enrichment] = await Promise.all([
    getRegionLive(c.geo?.region),
    getSimilarCompanies(c.number, c.sicCodes[0], c.geo?.region),
    // Digital-presence enrichment hits the paid Places API — only run it for
    // unlocked users so public crawler traffic never burns the quota.
    unlocked
      ? enrichCompany({
          number: c.number,
          name: c.name,
          locality: c.geo?.locality ?? c.address?.locality,
          postcode: c.address?.postcode ?? c.geo?.postcode,
        }).catch(() => null as CompanyEnrichment | null)
      : Promise.resolve(null as CompanyEnrichment | null),
  ]);
  const report = buildIntelligenceReport(c, economicLive);

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: c.name,
    identifier: c.number,
    url: `${SITE_URL}/company/${c.number}`,
    ...(c.geo?.region && c.geo.region !== "Unknown"
      ? { address: { "@type": "PostalAddress", addressRegion: c.geo.region, addressCountry: "GB" } }
      : {}),
    ...(c.incorporated ? { foundingDate: c.incorporated } : {}),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Companies", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: c.name, item: `${SITE_URL}/company/${c.number}` },
    ],
  };

  return (
    <>
      <JsonLd data={[orgSchema, breadcrumb]} />
      <PublicReportChrome unlocked={unlocked} signedIn={signedIn}>
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
          unlocked={unlocked}
          gate={gate}
          partner={partner}
        />
      </PublicReportChrome>
    </>
  );
}
