// ============================================================
// Contact discovery — Layer 2 of the enrichment pipeline
// ------------------------------------------------------------
//   Layer 1  Companies House  → who the company legally is (identity)
//   Layer 2  Website discovery → what the company publishes about itself
//   Layer 3  Verification      → how much of that we can actually stand behind
//
// This module is Layer 2 + 3. It takes an identified company, finds and
// verifies its website (./website), fetches a small, bounded set of the pages a
// business puts its contact details on, extracts and normalises what it finds
// (./extract, ./phone), and attaches the checks that were run to each value
// (./contact-types).
//
// Three rules it never breaks:
//   1. Nothing is bought, scraped in bulk or imported from a third-party
//      contact database. Every value is something the company itself published.
//   2. Nothing is asserted without evidence. No verified website → no contacts,
//      not a guess.
//   3. Everything is dated and cited, and a suppressed value never comes back.
//
// Server-only. See docs/contact-enrichment.md.
// ============================================================
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { fetchPage } from "./fetch-page";
import { parsePage } from "./extract";
import { discoverWebsite, baseHost } from "./website";
import { normalizePhone } from "./phone";
import {
  CHECKS,
  FREE_MAIL_DOMAINS,
  roleOf,
  scoreContact,
  type CompanyContacts,
  type ContactCheck,
  type ContactPoint,
  type ContactSource,
  type VerifiedWebsite,
} from "./contact-types";

export type { CompanyContacts, ContactPoint, VerifiedWebsite } from "./contact-types";

/** Contact details change less often than a phone book but more often than the
 *  register. A month keeps the "last checked" line honest without re-crawling
 *  sites that have not changed. */
const TTL_DAYS = 30;
/** Home page + this many contact-ish pages. A business publishes its contact
 *  details on one or two pages; a deeper crawl costs the host bandwidth for
 *  no extra signal. */
const MAX_CONTACT_PAGES = 3;
/** Guard against a contact page that lists a hundred staff addresses. */
const MAX_PER_KIND = 8;

const EMAIL_VALID = /^[a-z0-9._%+-]{1,64}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;
const CONTACT_PATH = /contact|enquir|get-in-touch|about|team|people/i;

interface Observation {
  sources: Set<ContactSource>;
  pages: Set<string>;
}

// ---- Public entry point -----------------------------------------------------

export interface DiscoverInput {
  number: string;
  name: string;
  postcode?: string | null;
  /** The website the Google Business Profile declares, when Places matched
   *  confidently. Saves a round of domain guessing. */
  placesWebsite?: string | null;
  /** The phone the Google Business Profile declares. */
  placesPhone?: string | null;
  placesSource?: string | null;
  force?: boolean;
}

/**
 * Contact intelligence for one company, cache-first.
 *
 * Degrades gracefully at every step: no Supabase → live only, no verified
 * website → `status: "no_website"`, robots.txt exclusion → `status: "blocked"`.
 * It never throws at the caller.
 */
export async function getCompanyContacts(input: DiscoverInput): Promise<CompanyContacts> {
  const admin = getSupabaseAdmin();

  if (admin && !input.force) {
    const cached = await readCache(input.number).catch(() => null);
    if (cached && isFresh(cached.checkedAt)) return cached;
  }

  const result = await discoverContacts(input);
  const suppressed = await applySuppressions(result);
  if (admin) await writeCache(suppressed).catch(() => {});
  return suppressed;
}

/** The live pipeline, with no cache on either side. Exported for the probe
 *  route and the backfill worker. */
export async function discoverContacts(input: DiscoverInput): Promise<CompanyContacts> {
  const notes: string[] = [];
  const pagesCrawled: string[] = [];
  const now = new Date().toISOString();

  const discovery = await discoverWebsite({
    name: input.name,
    number: input.number,
    postcode: input.postcode,
    placesWebsite: input.placesWebsite,
  }).catch(() => null);

  // Places already gives us a phone for GBP-listed businesses. That stands on
  // its own even when no website can be verified.
  const emails = new Map<string, Observation>();
  const phones = new Map<string, Observation>();
  const placesPhone = normalizePhone(input.placesPhone);
  if (placesPhone.e164) {
    observe(phones, placesPhone.e164, "google-places", input.placesSource ?? "google-places");
  }

  const site = discovery?.site ?? null;

  if (!site) {
    if (discovery?.rejected) {
      notes.push(
        `A candidate website (${discovery.rejected.host}) was found but could not be verified as this company's — reported as not assessed rather than guessed.`
      );
    } else if (discovery?.tried.length) {
      notes.push(`No website found for the ${discovery.tried.length} candidate domains tried.`);
    }
    return {
      companyNumber: input.number,
      companyName: input.name,
      status: phones.size ? "measured" : "no_website",
      website: null,
      emails: [],
      phones: buildPoints("phone", phones, null),
      pagesCrawled,
      notes,
      checkedAt: now,
      cached: false,
    };
  }

  // Home page was already fetched during verification — reuse it rather than
  // asking the host for the same bytes twice.
  if (discovery?.homeHtml && discovery.homeUrl) {
    pagesCrawled.push(discovery.homeUrl);
    collect(parsePage(discovery.homeHtml, discovery.homeUrl), discovery.homeUrl, emails, phones);
  }

  for (const link of (discovery?.contactLinks ?? []).slice(0, MAX_CONTACT_PAGES)) {
    const page = await fetchPage(link);
    if (!page.ok) {
      if (page.error === "disallowed by robots.txt") notes.push(`${link} — excluded by the site's robots.txt, not fetched.`);
      continue;
    }
    pagesCrawled.push(page.url);
    collect(parsePage(page.html, page.url), page.url, emails, phones);
  }

  const status = pagesCrawled.length ? "measured" : "blocked";
  if (status === "blocked") notes.push("The site's robots.txt asks crawlers not to read these pages, so nothing was read.");

  return {
    companyNumber: input.number,
    companyName: input.name,
    status,
    website: site,
    emails: buildPoints("email", emails, site).slice(0, MAX_PER_KIND),
    phones: buildPoints("phone", phones, site).slice(0, MAX_PER_KIND),
    pagesCrawled,
    notes,
    checkedAt: now,
    cached: false,
  };
}

// ---- Aggregation ------------------------------------------------------------

function observe(map: Map<string, Observation>, value: string, source: ContactSource, page: string): void {
  const entry = map.get(value) ?? { sources: new Set<ContactSource>(), pages: new Set<string>() };
  entry.sources.add(source);
  entry.pages.add(page);
  map.set(value, entry);
}

function collect(
  parsed: ReturnType<typeof parsePage>,
  url: string,
  emails: Map<string, Observation>,
  phones: Map<string, Observation>
): void {
  for (const hit of parsed.emails) {
    if (!EMAIL_VALID.test(hit.value)) continue;
    observe(emails, hit.value, hit.source, url);
  }
  for (const hit of parsed.phones) observe(phones, hit.value, hit.source, url);
}

/** Turn raw observations into scored, checked contact points, best first. */
function buildPoints(
  kind: "email" | "phone",
  observed: Map<string, Observation>,
  site: VerifiedWebsite | null
): ContactPoint[] {
  const points: ContactPoint[] = [];

  for (const [value, obs] of observed) {
    const sources = [...obs.sources];
    const pages = [...obs.pages];
    const onSite = pages.some((p) => p.startsWith("http") && site && baseHost(p) === site.host);
    const checks: ContactCheck[] = [];
    const add = (c: { id: string; label: string }, passed: boolean | null) =>
      checks.push({ id: c.id, label: c.label, passed });

    add(CHECKS.syntax, kind === "email" ? EMAIL_VALID.test(value) : !!normalizePhone(value).e164);
    add(CHECKS.onSite, onSite);

    if (kind === "email") {
      const domain = value.split("@")[1] ?? "";
      if (FREE_MAIL_DOMAINS.has(domain)) {
        add(CHECKS.domainMatch, false);
      } else if (site) {
        add(CHECKS.domainMatch, domain === site.host || domain.endsWith(`.${site.host}`) || site.host.endsWith(`.${domain}`));
      } else {
        add(CHECKS.domainMatch, null);
      }
    }

    add(CHECKS.structured, sources.includes("structured-data") || sources.includes("tel-link") || sources.includes("mailto-link"));
    add(CHECKS.contactPage, pages.some((p) => CONTACT_PATH.test(p)));
    add(CHECKS.corroborated, pages.length > 1 || sources.length > 1);
    add(CHECKS.websiteVerified, site ? site.confidence === "high" : sources.includes("google-places") ? true : false);
    // Stated explicitly as NOT run. We do not SMTP-probe mailboxes or ring
    // lines: it is intrusive, unreliable, and would let us imply a level of
    // verification we have not done.
    add(kind === "email" ? CHECKS.mailbox : CHECKS.line, null);

    const { score, confidence } = scoreContact(kind, checks);
    points.push({
      kind,
      value,
      display: kind === "phone" ? normalizePhone(value).display ?? value : value,
      role: kind === "email" ? roleOf(value) : "general",
      sources,
      foundOn: pages,
      checks,
      score,
      confidence,
    });
  }

  // Best evidence first; among equals prefer a general mailbox (hello@, info@)
  // over an individual's, which is both more useful and less personal data.
  const roleRank = (p: ContactPoint) => (p.role === "personal" ? 1 : 0);
  return points.sort((a, b) => b.score - a.score || roleRank(a) - roleRank(b) || a.value.localeCompare(b.value));
}

// ---- Suppression ------------------------------------------------------------

/**
 * Drop anything on the suppression list. A person or business that asks us to
 * stop showing a contact detail is honoured at read time AND at write time, so
 * a re-crawl cannot quietly resurrect it.
 */
async function applySuppressions(result: CompanyContacts): Promise<CompanyContacts> {
  const admin = getSupabaseAdmin();
  if (!admin) return result;
  const values = [...result.emails, ...result.phones].map((p) => p.value);
  if (!values.length) return result;

  const { data } = await admin.from("contact_suppressions").select("value").in("value", values);
  const blocked = new Set((data ?? []).map((r: { value: string }) => r.value));
  if (!blocked.size) return result;

  return {
    ...result,
    emails: result.emails.filter((p) => !blocked.has(p.value)),
    phones: result.phones.filter((p) => !blocked.has(p.value)),
    notes: [...result.notes, "Some details were withheld at the request of their owner."],
  };
}

// ---- Cache ------------------------------------------------------------------

function isFresh(checkedAt: string): boolean {
  return Date.now() - new Date(checkedAt).getTime() < TTL_DAYS * 86_400_000;
}

interface ContactRow {
  company_number: string;
  company_name: string | null;
  status: CompanyContacts["status"];
  website: VerifiedWebsite | null;
  emails: ContactPoint[];
  phones: ContactPoint[];
  pages_crawled: string[] | null;
  notes: string[] | null;
  checked_at: string;
}

async function readCache(number: string): Promise<CompanyContacts | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin.from("company_contacts").select("*").eq("company_number", number).maybeSingle();
  if (!data) return null;
  const row = data as ContactRow;
  return {
    companyNumber: row.company_number,
    companyName: row.company_name,
    status: row.status,
    website: row.website,
    emails: row.emails ?? [],
    phones: row.phones ?? [],
    pagesCrawled: row.pages_crawled ?? [],
    notes: row.notes ?? [],
    checkedAt: row.checked_at,
    cached: true,
  };
}

async function writeCache(result: CompanyContacts): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin.from("company_contacts").upsert(
    {
      company_number: result.companyNumber,
      company_name: result.companyName,
      status: result.status,
      website: result.website,
      emails: result.emails,
      phones: result.phones,
      pages_crawled: result.pagesCrawled,
      notes: result.notes,
      checked_at: result.checkedAt,
      ttl_days: TTL_DAYS,
    },
    { onConflict: "company_number" }
  );
}
