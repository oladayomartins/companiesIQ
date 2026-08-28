// PUBLIC company report — the SEO surface. Crawlable profile (overview,
// industry, location, people, filing history, basic market snapshot) with the
// deep intelligence gated behind sign-in. Logged-in users see the full report
// inline; logged-out visitors (and Googlebot) see the free preview + an
// "Unlock full intelligence" gate.
import Link from "next/link";
import { headers } from "next/headers";
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
import { hasProAccess, canUseHistoricalData, FREE_FILING_WINDOW } from "@/lib/access";
import { isWatched } from "@/lib/watchlist";
import { getSavedLens } from "@/lib/profile";
import { getDirectorNetwork } from "@/lib/network";
import { Button } from "@/components/ds";
import { ErrorState } from "@/components/app/ErrorState";
import { CompanyProfile } from "@/components/app/CompanyProfile";
import { TrackCompanyCta } from "@/components/app/TrackCompanyCta";
import { RelatedGuides } from "@/components/RelatedGuides";
import { guidesForCompany } from "@/lib/guides";
import { FinancialsCard } from "@/components/app/FinancialsCard";
import { getCompanyFinancials } from "@/lib/enrichment/financials";
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
    // "Try again in a moment" is only true when the register itself is busy.
    // Anything else is ours to fix, and telling the visitor to keep refreshing
    // would leave them doing it forever.
    const busy = e instanceof CompaniesHouseError && e.kind === "rate_limited";
    return (
      <PublicShell>
        <div className="screen">
          <ErrorState
            title={busy ? "The register is busy right now" : "We couldn't load this company"}
            body={
              busy
                ? "Companies House briefly rate-limits high traffic. Reloading in a moment usually works."
                : "Something went wrong on our side fetching this company from Companies House. It's logged — please try again shortly."
            }
            actions={
              <>
                <Button href={`/company/${number}`} variant="primary" iconRight="arrowRight">
                  Try again
                </Button>
                <Button href="/search" variant="secondary">
                  Search companies
                </Button>
              </>
            }
            links={
              <>
                <Link href="/industry">Industries</Link>
                <Link href="/market">Markets</Link>
                <Link href="/city">Cities</Link>
                <Link href="/sources">Sources &amp; methodology</Link>
              </>
            }
          />
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
  // "Complete filing history" is an Analyst feature. Free accounts see the most
  // recent window instead. The FULL list still reaches the scorer below — the
  // opportunity score must not change with the reader's plan.
  const fullHistory = await canUseHistoricalData(user);

  // Metered free access, decided in middleware (a page cannot set cookies during
  // render). A logged-out visitor reads a few full reports before the gate
  // appears — Google's flexible-sampling guidance prefers that to a hard lead-in
  // gate, and a search visitor who lands on a blur just goes back to the SERP.
  const h = await headers();
  const metered = !signedIn && h.get("x-ciq-meter") === "allow";
  const meterLeft = Number(h.get("x-ciq-meter-left") ?? 0) || 0;

  const [economicLive, similar, enrichment, network, financials] = await Promise.all([
    getRegionLive(c.geo?.region),
    // 24 peers (not 6) so the Competitors tab has a table AND a score
    // distribution worth drawing — the underlying query already fetches 60.
    getSimilarCompanies(c.number, c.sicCodes[0], c.geo?.region, 24),
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
    unlocked ? getDirectorNetwork(bundle.officers, c.number, c.name).catch(() => null) : Promise.resolve(null),
    // Financials from filed accounts (iXBRL) — free Companies House data, so
    // shown on the public report too. Phase 2 moves this to the register cache
    // (see docs/financials-ixbrl.md) to drop the per-request document fetch.
    getCompanyFinancials(c.number, { name: c.name }).catch(() => null),
  ]);
  const report = buildIntelligenceReport(c, economicLive);
  const watched = unlocked ? await isWatched(c.number).catch(() => false) : false;
  // A Pro user's pinned lens ("what I sell") seeds the report; the client still
  // overrides it with a per-session switch.
  const savedLens = user ? await getSavedLens(user.id).catch(() => null) : null;

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    // A stable @id, because the layout also emits an Organization for
    // CompaniesIQ itself. Two unlabelled Organization nodes leave a parser
    // guessing which one the page is actually about; this one is named as the
    // page's mainEntity below.
    "@id": `${SITE_URL}/company/${c.number}#organization`,
    name: c.name,
    identifier: c.number,
    url: `${SITE_URL}/company/${c.number}`,
    // The full registered office, not just the region. Rich Results flagged
    // streetAddress, addressLocality and postalCode as missing-but-optional —
    // and we hold all three, from the same Companies House record the page
    // already renders them from. A complete PostalAddress is what lets an
    // answer engine place the company, so partial data here was a straight loss.
    ...(c.address || (c.geo?.region && c.geo.region !== "Unknown")
      ? {
          address: {
            "@type": "PostalAddress",
            ...(c.address?.line1
              ? { streetAddress: [c.address.line1, c.address.line2].filter(Boolean).join(", ") }
              : {}),
            ...(c.address?.locality ? { addressLocality: c.address.locality } : {}),
            ...(c.geo?.region && c.geo.region !== "Unknown" ? { addressRegion: c.geo.region } : {}),
            ...(c.address?.postcode ? { postalCode: c.address.postcode } : {}),
            addressCountry: "GB",
          },
        }
      : {}),
    ...(c.incorporated ? { foundingDate: c.incorporated } : {}),
    // Answer engines quote status and dates directly; make both machine-readable
    // rather than leaving them to be parsed out of the prose.
    ...(c.dissolved ? { dissolutionDate: c.dissolved } : {}),
    ...(c.primaryClassification?.sector ? { knowsAbout: c.primaryClassification.sector } : {}),
  };
  // Paywall declaration — REQUIRED, not optional polish.
  //
  // We serve the gated intelligence to Googlebot in full (it is in the DOM,
  // blurred by CSS) while a logged-out human has to register to read it.
  // Google treats exactly that as cloaking unless the gated section is declared
  // with isAccessibleForFree:false and a hasPart cssSelector pointing at it —
  // and the documented penalty is the page not appearing in search at all.
  //
  // Only emitted when the page is actually gated. A signed-in reader has the
  // content, so claiming otherwise would be its own inaccuracy.
  // https://developers.google.com/search/docs/appearance/structured-data/paywalled-content
  const paywallSchema = !signedIn
    ? {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${SITE_URL}/company/${c.number}`,
        url: `${SITE_URL}/company/${c.number}`,
        name: `${c.name} — company report`,
        mainEntity: { "@id": `${SITE_URL}/company/${c.number}#organization` },
        isAccessibleForFree: false,
        hasPart: {
          "@type": "WebPageElement",
          isAccessibleForFree: false,
          // Must match the class on the wrapper around the gated content
          // (components/app/IntelGate.tsx). Google accepts .class selectors only.
          cssSelector: ".intelgate__veil",
        },
      }
    : null;

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
      <JsonLd data={[orgSchema, breadcrumb, ...(paywallSchema ? [paywallSchema] : [])]} />
      <PublicReportChrome unlocked={unlocked} signedIn={signedIn}>
        <CompanyProfile
          company={c}
          officers={bundle.officers}
          filings={bundle.filings}
          filingLimit={fullHistory ? null : FREE_FILING_WINDOW}
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
          savedLens={savedLens}
          metered={metered}
          meterLeft={meterLeft}
        />
        {/* The free-alerts band sits BELOW the report now, not above the company
            name. It predates the registration gate, and with the gate in place
            two orange asks 400px apart were competing: "create an account" and
            "give us your email instead". Ordered by commitment, they stop
            fighting — the gate is the primary ask, and this is the fallback for
            someone who does not want an account at all. */}
        {!signedIn ? (
          <TrackCompanyCta company={c.name} number={c.number} sector={c.primaryClassification?.sector} />
        ) : null}
        {financials ? (
          <div className="screen" style={{ paddingTop: 0 }}>
            <FinancialsCard financials={financials} company={c.name} />
          </div>
        ) : null}
        <div className="screen" style={{ paddingTop: 0 }}>
          <RelatedGuides guides={guidesForCompany()} dark />
        </div>
      </PublicReportChrome>
    </>
  );
}
