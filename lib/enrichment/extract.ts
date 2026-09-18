// ============================================================
// HTML extraction — pull contact evidence out of a fetched page
// ------------------------------------------------------------
// Deliberately dependency-free and regex-based: these pages are fetched
// without JavaScript, we only need a handful of well-defined shapes out of
// them, and a real DOM parser would be a 300 kB dependency in a serverless
// function for no extra signal.
//
// Three passes, most trustworthy first:
//   1. structured data  — schema.org JSON-LD `email` / `telephone`
//   2. machine links    — <a href="mailto:…"> / <a href="tel:…">
//   3. visible text     — what a human reads in the footer or contact block
//
// The source of each hit is kept, because it is the difference between a
// number the site author machine-declared and a number we scraped out of prose.
//
// Pure + client-safe. See docs/contact-enrichment.md.
// ============================================================
import { extractPhones, normalizePhone } from "./phone";
import type { ContactSource } from "./contact-types";

export interface ExtractedHit {
  value: string; // raw, un-normalised
  source: ContactSource;
}

export interface PageExtract {
  emails: ExtractedHit[];
  phones: ExtractedHit[];
  /** Same-site links that look like contact/about pages, absolute. */
  contactLinks: string[];
  /** Visible text, collapsed — used for the website-identity checks. */
  text: string;
  title: string;
}

// ---- Small HTML helpers -----------------------------------------------------

const TAG_STRIP = /<(script|style|noscript|template|svg)\b[^>]*>[\s\S]*?<\/\1>/gi;

/** Visible text, entity-decoded and whitespace-collapsed. */
export function visibleText(html: string): string {
  return decodeEntities(html.replace(TAG_STRIP, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)));
}

// ---- Emails -----------------------------------------------------------------

// Intentionally stricter than RFC 5322: a TLD of 2+ letters, no consecutive
// dots, and a local part without the exotic quoting nobody publishes on a
// website. Over-permissive email regexes are how scrapers end up storing
// "2024@media" out of a CSS file.
const EMAIL_RE = /\b[a-z0-9._%+-]{1,64}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}\b/gi;

/** Files and image sprites that look like emails once the extension is read
 *  as a TLD (e.g. "logo@2x.png"), plus the placeholders everyone ships. */
const EMAIL_NOISE =
  /@(?:2x|3x|sentry\.io|example\.(?:com|org)|domain\.com|email\.com|yourcompany\.|test\.com)|\.(?:png|jpe?g|gif|svg|webp|css|js)$/i;

/** Sites obfuscate to dodge scrapers: "hello [at] example [dot] co [dot] uk". */
const OBFUSCATED_RE =
  /\b([a-z0-9._%+-]{1,64})\s*(?:\[|\(|\s)\s*(?:at|@)\s*(?:\]|\)|\s)\s*((?:[a-z0-9-]+\s*(?:\[|\(|\s)\s*(?:dot|\.)\s*(?:\]|\)|\s)\s*)+[a-z]{2,24})\b/gi;

function deobfuscate(domainish: string): string {
  return domainish.replace(/\s*(?:\[|\()?\s*(?:dot|\.)\s*(?:\]|\))?\s*/gi, ".").replace(/\s+/g, "");
}

export function extractEmails(html: string, text: string): ExtractedHit[] {
  const hits: ExtractedHit[] = [];
  const seen = new Set<string>();
  const push = (raw: string, source: ContactSource) => {
    const value = raw.trim().toLowerCase().replace(/^mailto:/, "").split("?")[0];
    if (!value || EMAIL_NOISE.test(value) || value.includes("..")) return;
    const key = `${value}|${source}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({ value, source });
  };

  for (const m of html.matchAll(/href\s*=\s*["']\s*mailto:([^"'?]+)/gi)) push(decodeEntities(m[1]), "mailto-link");
  for (const m of text.match(EMAIL_RE) ?? []) push(m, "page-text");
  for (const m of text.matchAll(OBFUSCATED_RE)) push(`${m[1].trim()}@${deobfuscate(m[2])}`, "page-text");

  return hits;
}

// ---- Phones -----------------------------------------------------------------

export function extractPhoneHits(html: string, text: string): ExtractedHit[] {
  const hits: ExtractedHit[] = [];
  const seen = new Set<string>();
  const push = (raw: string, source: ContactSource) => {
    const { e164 } = normalizePhone(raw);
    if (!e164) return;
    const key = `${e164}|${source}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({ value: e164, source });
  };

  for (const m of html.matchAll(/href\s*=\s*["']\s*tel:([^"']+)/gi)) push(decodeEntities(m[1]), "tel-link");
  for (const p of extractPhones(text)) push(p, "page-text");

  return hits;
}

// ---- Structured data --------------------------------------------------------

const ORG_TYPES = /organization|organisation|localbusiness|store|corporation|professionalservice|.*business/i;

/**
 * Walk every JSON-LD block and collect `email` / `telephone` from any
 * Organization-ish node, including nodes nested under @graph, contactPoint or
 * arrays. Malformed JSON-LD is extremely common, so a parse failure on one
 * block never stops the others.
 */
export function extractStructured(html: string): { emails: string[]; phones: string[]; urls: string[] } {
  const emails = new Set<string>();
  const phones = new Set<string>();
  const urls = new Set<string>();

  for (const m of html.matchAll(/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(decodeEntities(m[1].trim()));
    } catch {
      continue;
    }
    walk(parsed, 0);
  }

  function walk(node: unknown, depth: number): void {
    if (depth > 8 || node == null) return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n, depth + 1);
      return;
    }
    if (typeof node !== "object") return;
    const obj = node as Record<string, unknown>;

    const type = obj["@type"];
    const types = (Array.isArray(type) ? type : [type]).filter((t): t is string => typeof t === "string");
    const isOrg = types.some((t) => ORG_TYPES.test(t));

    if (isOrg) {
      for (const v of asStrings(obj.email)) emails.add(v.replace(/^mailto:/i, "").trim().toLowerCase());
      for (const v of asStrings(obj.telephone)) phones.add(v);
      for (const v of asStrings(obj.url)) urls.add(v);
    }
    // contactPoint carries the numbers on plenty of real sites even when the
    // parent Organization doesn't, so recurse regardless of the type check.
    for (const v of Object.values(obj)) walk(v, depth + 1);
  }

  return { emails: [...emails], phones: [...phones], urls: [...urls] };
}

function asStrings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}

// ---- Contact-page discovery -------------------------------------------------

/** Paths worth following from the home page, in priority order. Matches the
 *  hrefs a site actually uses rather than guessing URLs that 404. */
const CONTACT_HINTS = [
  "contact-us",
  "contact",
  "get-in-touch",
  "enquiries",
  "enquiry",
  "about-us",
  "about",
  "team",
  "our-team",
  "people",
  "privacy",
  "terms",
  "legal",
  "imprint",
];

/** Same-origin links whose href or anchor text suggests contact details,
 *  ranked so the crawl budget is spent on /contact before /terms. */
export function extractContactLinks(html: string, baseUrl: string): string[] {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return [];
  }

  const scored = new Map<string, number>();
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)) {
    const href = decodeEntities(m[1]).trim();
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) continue;
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }
    if (url.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;

    const path = url.pathname.toLowerCase();
    const anchor = visibleText(m[2]).toLowerCase();
    const rank = CONTACT_HINTS.findIndex((h) => path.includes(h) || anchor === h.replace(/-/g, " "));
    if (rank === -1) continue;

    url.hash = "";
    const key = url.toString();
    const prev = scored.get(key);
    if (prev === undefined || rank < prev) scored.set(key, rank);
  }

  return [...scored.entries()].sort((a, b) => a[1] - b[1]).map(([url]) => url);
}

// ---- One-shot page parse ----------------------------------------------------

export function parsePage(html: string, url: string): PageExtract {
  const text = visibleText(html);
  const structured = extractStructured(html);

  const emails: ExtractedHit[] = [
    ...structured.emails.map((value) => ({ value, source: "structured-data" as const })),
    ...extractEmails(html, text),
  ];
  const phones: ExtractedHit[] = [
    ...structured.phones
      .map((p) => normalizePhone(p).e164)
      .filter((v): v is string => !!v)
      .map((value) => ({ value, source: "structured-data" as const })),
    ...extractPhoneHits(html, text),
  ];

  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]{0,300}?)<\/title>/i)?.[1] ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return { emails, phones, contactLinks: extractContactLinks(html, url), text, title };
}
