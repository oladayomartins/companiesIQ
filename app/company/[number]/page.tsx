// PUBLIC company report — the SEO surface. Crawlable profile (overview,
// industry, location, people, filing history, basic market snapshot) with the
// deep intelligence gated behind sign-in. Logged-in users see the full report
// inline; logged-out visitors (and Googlebot) see the free preview + an
// "Unlock full intelligence" gate.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCompanyBundle } from "@/lib/data";
import { getCompany, CompaniesHouseError } from "@/lib/companies-house";
import { buildIntelligenceReport } from "@/lib/analytics";
import { getSimilarCompanies } from "@/lib/similar";
import { getRegionLive } from "@/lib/nomis";
import { enrichCompany, type CompanyEnrichment } from "@/lib/enrichment";
import { getCurrentUser } from "@/lib/supabase/server";
import { isPartner } from "@/lib/admin";
import { hasProAccess } from "@/lib/access";
import { isWatched } from "@/lib/watchlist";
import { getDirectorNetwork } from "@/lib/network";
import { CompanyProfile } from "@/components/app/CompanyProfile";
import { PublicReportChrome } from "@/components/report/PublicChrome";
import { PublicShell } from "@/components/public/PublicShell";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { fmtDate } from "@/lib/format";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }): Promise<Metadata> {
  const { number } = await params;
  // Metadata only needs the company profile (1 call) — not the full 5-call
  // bundle. The call dedupes with the page render's getCompany within the request.
  // Never throw from metadata — a CH error (404, 429, …) just yields a fallback title.
  const c = await getCompany(number).catch(() => null);
  if (!c) return { title: "Company" };
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
  // getCompanyBundle returns null on 404; other Companies House errors (e.g. a
  // 429 rate-limit) throw — catch them and show a graceful "register busy" page
  // instead of a 500.
  let bundle;
  try {
    bundle = await getCompanyBundle(number);
  } catch (e) {
    if (e instanceof CompaniesHouseError && e.status === 404) notFound();
    return (
      <PublicShell>
        <div className="screen" style={{ textAlign: "center", paddingTop: 80 }}>
          <div className="app-eyebrow">Companies House</div>
          <h1 className="screen-title" style={{ marginBottom: 10 }}>The register is busy right now</h1>
          <p className="public-lede" style={{ maxWidth: 520, margin: "0 auto" }}>
            We couldn&apos;t reach Companies House for this company just now (it briefly rate-limits high traffic).
            Please refresh in a moment.
          </p>
        </div>
      </PublicShell>
    );
  }
  if (!bundle) notFound();

  const c = bundle.company;
  const user = await getCurrentUser();
  // Intelligence is Pro-only: subscribers see the full report; everyone else
  // (anonymous or free) gets the public profile + a blurred Go-Pro teaser.
  const signedIn = !!user;
  const subscribed = await hasProAccess(user);
  const unlocked = subscribed;
  const partner = isPartner(user);

  const [economicLive, similar, enrichment, network] = await Promise.all([
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
    // Director network (shared-director connections) — gated, costs officer-
    // appointment calls, so unlocked-only.
    unlocked ? getDirectorNetwork(bundle.officers, c.number).catch(() => null) : Promise.resolve(null),
  ]);
  const report = buildIntelligenceReport(c, economicLive);
  const watched = unlocked ? await isWatched(c.number).catch(() => false) : false;

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
          partner={partner}
          signedIn={signedIn}
          watched={watched}
          network={network}
        />
      </PublicReportChrome>
    </>
  );
}
