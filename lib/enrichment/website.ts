// ============================================================
// Website discovery + verification
// ------------------------------------------------------------
// Companies House does not record a website, so the company's own site has to
// be found. Two routes, in order of trust:
//
//   1. Google Business Profile — the business itself told Google its website.
//      Already measured by ./places, so it costs nothing extra here.
//   2. Domain guessing — derive plausible hosts from the company name
//      ("ABC Digital Ltd" → abcdigital.co.uk, abc-digital.co.uk, abcdigital.com)
//      and try them.
//
// A candidate is NEVER accepted because it resolves. Plenty of parked domains,
// squatters and unrelated businesses sit on the obvious host for a name. The
// page has to prove it belongs to THIS company — by carrying the company name,
// the registered company number (UK sites are legally required to publish it)
// or the registered postcode. Below the bar, we report "no website verified"
// rather than a guess, because a wrong website poisons every contact detail
// scraped from it.
//
// Server-only. See docs/contact-enrichment.md.
// ============================================================
import "server-only";
import { fetchPage } from "./fetch-page";
import { parsePage } from "./extract";
import type { ContactCheck, ConfidenceLevel, VerifiedWebsite } from "./contact-types";

/** Hosts that are somebody else's platform, never the company's own site. */
const PLATFORM_HOSTS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "youtube.com",
  "wa.me",
  "business.site", // Google's own free site builder — a GBP mirror, not a site
  "sites.google.com",
  "wixsite.com",
  "square.site",
  "checkatrade.com",
  "yell.com",
  "trustpilot.com",
  "companieshouse.gov.uk",
  "find-and-update.company-information.service.gov.uk",
  "endole.co.uk",
  "companycheck.co.uk",
];

const TLDS = [".co.uk", ".com", ".uk", ".org.uk", ".ltd.uk", ".net"];
const MAX_GUESSES = 6;

const WEIGHTS = {
  reachable: 20,
  nameOnPage: 25,
  numberOnPage: 30,
  postcodeOnPage: 20,
  placesDeclared: 25,
} as const;
const WEBSITE_MAX = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

/** Below this, we do not treat the site as the company's and do not crawl it. */
export const WEBSITE_ACCEPT_SCORE = 45;

// Conservative on purpose — legal-form noise only, matching ./places. Stripping
// distinguishing words ("group", "services", "trading") would both widen the
// domain guesses and, worse, LOOSEN the name check below, which is the thing
// keeping us off somebody else's website.
const LEGAL_SUFFIX = /\b(ltd|limited|plc|llp|llc|inc|cyf|cyfyngedig|the|company|co)\b/g;

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(LEGAL_SUFFIX, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/** Host without the www, lower-cased. The comparison key for a website. */
export function baseHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isPlatform(host: string): boolean {
  return PLATFORM_HOSTS.some((p) => host === p || host.endsWith(`.${p}`));
}

/** Candidate hosts derived from the company name, most likely first. */
export function guessDomains(companyName: string): string[] {
  const tokens = nameTokens(companyName);
  if (!tokens.length) return [];
  const joined = tokens.join("");
  const hyphenated = tokens.join("-");
  // A one-word name like "Smith Ltd" produces "smith", which is somebody
  // else's domain with near-certainty. Only guess when the name is
  // distinctive enough to be worth a request.
  if (joined.length < 6) return [];

  const stems = tokens.length > 1 ? [joined, hyphenated] : [joined];
  const out: string[] = [];
  for (const tld of TLDS) {
    for (const stem of stems) {
      out.push(`${stem}${tld}`);
      if (out.length >= MAX_GUESSES) return out;
    }
  }
  return out;
}

// ---- Verification -----------------------------------------------------------

/** UK-style postcode, tolerant of a missing space. */
function postcodeVariants(postcode?: string | null): string[] {
  if (!postcode) return [];
  const flat = postcode.toUpperCase().replace(/\s+/g, "");
  if (flat.length < 5) return [];
  const spaced = `${flat.slice(0, -3)} ${flat.slice(-3)}`;
  return [flat, spaced];
}

export interface WebsiteCandidate {
  url: string;
  via: "google-places" | "domain-guess";
}

/**
 * Fetch a candidate and score how strongly the page identifies itself as this
 * company's. Returns null when the page could not be fetched at all.
 */
async function verifyCandidate(
  candidate: WebsiteCandidate,
  company: { name: string; number: string; postcode?: string | null }
): Promise<{ site: VerifiedWebsite; contactLinks: string[]; homeHtml: string; homeUrl: string } | null> {
  const page = await fetchPage(candidate.url);
  const checks: ContactCheck[] = [];
  const add = (id: string, label: string, passed: boolean | null) => checks.push({ id, label, passed });

  if (!page.ok) {
    add("reachable", "Website responds", false);
    return null;
  }
  add("reachable", "Website responds", true);

  const parsed = parsePage(page.html, page.url);
  const haystack = `${parsed.title} ${parsed.text}`.toLowerCase();
  const flatHaystack = haystack.replace(/[^a-z0-9]/g, "");

  // Name: every distinctive token present (not just one), so "Smith Digital"
  // isn't matched by a page that merely says "digital".
  const tokens = nameTokens(company.name);
  const nameHit = tokens.length > 0 && tokens.every((t) => haystack.includes(t));
  add("name", "Company name appears on the page", nameHit);

  // Company number: UK sites must publish it, and it is unforgeable evidence.
  const numberHit = flatHaystack.includes(company.number.toLowerCase().replace(/[^a-z0-9]/g, ""));
  add("number", "Registered company number published on the site", numberHit);

  const pcs = postcodeVariants(company.postcode);
  const postcodeHit = pcs.length ? pcs.some((p) => haystack.includes(p.toLowerCase())) : null;
  add("postcode", "Registered postcode appears on the page", postcodeHit);

  const placesHit = candidate.via === "google-places";
  add("places", "Listed as the website on the Google Business Profile", placesHit);

  const earned =
    WEIGHTS.reachable + // we only reach this line on a successful fetch
    (nameHit ? WEIGHTS.nameOnPage : 0) +
    (numberHit ? WEIGHTS.numberOnPage : 0) +
    (postcodeHit ? WEIGHTS.postcodeOnPage : 0) +
    (placesHit ? WEIGHTS.placesDeclared : 0);
  const score = Math.round((earned / WEBSITE_MAX) * 100);
  const confidence: ConfidenceLevel = score >= 65 ? "high" : score >= WEBSITE_ACCEPT_SCORE ? "medium" : "low";

  const origin = new URL(page.url).origin;
  return {
    site: {
      url: origin,
      host: baseHost(page.url),
      checks,
      score,
      confidence,
      discoveredVia: candidate.via,
      contactPage: parsed.contactLinks[0] ?? null,
    },
    contactLinks: parsed.contactLinks,
    homeHtml: page.html,
    homeUrl: page.url,
  };
}

/**
 * Find and verify the company's website.
 *
 * Tries the GBP-declared site first (one request, high prior), then a small
 * number of name-derived guesses. Stops at the first candidate that clears
 * WEBSITE_ACCEPT_SCORE; returns the best REJECTED candidate's checks alongside
 * `null` so the UI can say what was tried rather than going silent.
 */
export async function discoverWebsite(company: {
  name: string;
  number: string;
  postcode?: string | null;
  placesWebsite?: string | null;
}): Promise<{
  site: VerifiedWebsite | null;
  rejected: VerifiedWebsite | null;
  contactLinks: string[];
  homeHtml: string | null;
  homeUrl: string | null;
  tried: string[];
}> {
  const candidates: WebsiteCandidate[] = [];
  if (company.placesWebsite && !isPlatform(baseHost(company.placesWebsite))) {
    candidates.push({ url: company.placesWebsite, via: "google-places" });
  }
  const placesHost = company.placesWebsite ? baseHost(company.placesWebsite) : "";
  for (const host of guessDomains(company.name)) {
    if (host === placesHost) continue;
    if (isPlatform(host)) continue;
    candidates.push({ url: `https://${host}`, via: "domain-guess" });
  }

  const tried: string[] = [];
  let best: Awaited<ReturnType<typeof verifyCandidate>> = null;

  for (const candidate of candidates) {
    tried.push(candidate.url);
    const result = await verifyCandidate(candidate, company).catch(() => null);
    if (!result) continue;
    if (!best || result.site.score > best.site.score) best = result;
    if (result.site.score >= WEBSITE_ACCEPT_SCORE) break;
  }

  if (!best) return { site: null, rejected: null, contactLinks: [], homeHtml: null, homeUrl: null, tried };
  const accepted = best.site.score >= WEBSITE_ACCEPT_SCORE;
  return {
    site: accepted ? best.site : null,
    rejected: accepted ? null : best.site,
    contactLinks: accepted ? best.contactLinks : [],
    homeHtml: accepted ? best.homeHtml : null,
    homeUrl: accepted ? best.homeUrl : null,
    tried,
  };
}
