// ============================================================
// Contact intelligence — types + confidence model
// ------------------------------------------------------------
// The product promise is NOT "here is an email address". It is:
//
//     hello@abcdigital.co.uk
//     ✓ Published on the company's own website
//     ✓ Domain matches the verified website
//     ✓ Syntax valid
//     ⚠ Mailbox not independently verified
//     Confidence: High · checked 17 September 2026
//
// Every contact point therefore travels with the CHECKS that were actually
// run against it, and its confidence is derived from those checks — never
// asserted. A reader can always see why we believe a value, and a check we
// did not run is shown as un-run rather than quietly passed.
//
// Pure + client-safe (no server-only imports) so the report UI can render
// and re-score without a round-trip. See docs/contact-enrichment.md.
// ============================================================

export type ContactKind = "email" | "phone";

/** Where a value was observed. Ordered loosely by how much we trust it. */
export type ContactSource =
  | "structured-data" // schema.org Organization/LocalBusiness on the company's site
  | "tel-link" // an <a href="tel:…"> — the site author's own machine-readable number
  | "mailto-link" // an <a href="mailto:…">
  | "page-text" // scraped from visible copy
  | "google-places"; // the company's Google Business Profile

/** Broad purpose, inferred from the local part. Never treated as evidence. */
export type ContactRole = "general" | "sales" | "support" | "accounts" | "privacy" | "careers" | "personal";

export type ConfidenceLevel = "high" | "medium" | "low";

/** One verification that was run (or deliberately not run) against a value. */
export interface ContactCheck {
  id: string;
  label: string;
  /** true = passed · false = failed · null = not run / not applicable. */
  passed: boolean | null;
}

export interface ContactPoint {
  kind: ContactKind;
  /** Canonical form: lower-cased email, or E.164 phone. The dedupe key. */
  value: string;
  /** Human form for display (E.164 spaced, email unchanged). */
  display: string;
  role: ContactRole;
  sources: ContactSource[];
  /** Page URLs the value was observed on — the citation. */
  foundOn: string[];
  checks: ContactCheck[];
  score: number; // 0..100, from the checks below
  confidence: ConfidenceLevel;
}

/** The website we believe belongs to the company, and why. */
export interface VerifiedWebsite {
  url: string; // normalised origin, e.g. https://abcdigital.co.uk
  host: string;
  checks: ContactCheck[];
  score: number;
  confidence: ConfidenceLevel;
  /** How we got to the candidate in the first place. */
  discoveredVia: "google-places" | "domain-guess";
  contactPage: string | null;
}

export type ContactStatus =
  | "measured" // we crawled a verified website and report what we found
  | "no_website" // no website could be verified — nothing claimed
  | "not_assessed" // discovery never ran (unenriched, or gated)
  | "blocked"; // the site's robots.txt asked us not to crawl these pages

export interface CompanyContacts {
  companyNumber: string;
  companyName: string | null;
  status: ContactStatus;
  website: VerifiedWebsite | null;
  emails: ContactPoint[];
  phones: ContactPoint[];
  /** Every URL actually fetched, so the evidence trail is complete. */
  pagesCrawled: string[];
  /** Human-readable notes (robots exclusions, fetch failures, suppressions). */
  notes: string[];
  checkedAt: string;
  cached: boolean;
}

// ---- Check catalogue --------------------------------------------------------
//
// Declared once so the scorer, the UI and the API all name a check the same
// way, and so adding a check is a single edit rather than three.

export const CHECKS = {
  syntax: { id: "syntax", label: "Syntax valid", weight: 15 },
  onSite: { id: "on-site", label: "Published on the company's own website", weight: 30 },
  domainMatch: { id: "domain-match", label: "Domain matches the verified website", weight: 25 },
  structured: { id: "structured", label: "Declared in the site's structured data", weight: 15 },
  contactPage: { id: "contact-page", label: "Found on a contact page", weight: 10 },
  corroborated: { id: "corroborated", label: "Seen on more than one page or source", weight: 15 },
  websiteVerified: { id: "website-verified", label: "Website independently verified as this company's", weight: 20 },
  mailbox: { id: "mailbox", label: "Mailbox independently verified", weight: 0 },
  line: { id: "line", label: "Line independently verified", weight: 0 },
} as const;

/** The maximum score an email can reach, so the percentage means something. */
const EMAIL_MAX =
  CHECKS.syntax.weight +
  CHECKS.onSite.weight +
  CHECKS.domainMatch.weight +
  CHECKS.structured.weight +
  CHECKS.contactPage.weight +
  CHECKS.corroborated.weight +
  CHECKS.websiteVerified.weight;

/** Phones carry no domain-match check, so they score against a smaller ceiling. */
const PHONE_MAX = EMAIL_MAX - CHECKS.domainMatch.weight;

/**
 * Turn a set of run checks into a 0..100 score and a band.
 *
 * Only checks that PASSED add weight; a check that failed or never ran adds
 * nothing. Bands are deliberately conservative — "high" needs the value to be
 * on a verified site AND corroborated or machine-declared, which is the bar
 * the marketing copy commits to.
 */
export function scoreContact(kind: ContactKind, checks: ContactCheck[]): { score: number; confidence: ConfidenceLevel } {
  const weightOf = (id: string): number =>
    (Object.values(CHECKS).find((c) => c.id === id)?.weight as number | undefined) ?? 0;

  const earned = checks.filter((c) => c.passed === true).reduce((sum, c) => sum + weightOf(c.id), 0);
  const max = kind === "email" ? EMAIL_MAX : PHONE_MAX;
  const score = Math.round((earned / max) * 100);

  const confidence: ConfidenceLevel = score >= 70 ? "high" : score >= 45 ? "medium" : "low";
  return { score, confidence };
}

/** A one-line, honest summary of a contact point for the UI and the API. */
export function confidenceReason(point: ContactPoint): string {
  const passed = point.checks.filter((c) => c.passed === true).length;
  const run = point.checks.filter((c) => c.passed !== null).length;
  return `${passed} of ${run} checks passed`;
}

// ---- Role inference ---------------------------------------------------------

const ROLE_PREFIXES: [ContactRole, string[]][] = [
  ["sales", ["sales", "newbusiness", "enquiries", "enquiry", "quotes", "bookings"]],
  ["support", ["support", "help", "service", "helpdesk"]],
  ["accounts", ["accounts", "invoices", "billing", "finance", "payments", "purchaseledger"]],
  ["privacy", ["privacy", "dpo", "gdpr", "dataprotection", "legal"]],
  ["careers", ["careers", "jobs", "recruitment", "hr"]],
  ["general", ["hello", "info", "contact", "mail", "office", "admin", "team", "reception"]],
];

/** Classify an email by its local part. A personal-looking address is flagged
 *  as such so downstream copy can warn that it is likely an individual. */
export function roleOf(email: string): ContactRole {
  const local = email.split("@")[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  for (const [role, prefixes] of ROLE_PREFIXES) {
    if (prefixes.some((p) => local === p || local.startsWith(p))) return role;
  }
  return "personal";
}

/** Public mailbox providers — an email here can never pass the domain match. */
export const FREE_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.co.uk",
  "live.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "btinternet.com",
  "sky.com",
  "virginmedia.com",
  "talktalk.net",
  "protonmail.com",
  "proton.me",
]);
