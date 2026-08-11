// ============================================================
// Email-derived identity — the personalization floor
// ------------------------------------------------------------
// A free user (never reaches Stripe) gives us only their verified email. This
// derives a best-effort first name + company from it so nothing is ever blank,
// while treating role/shared inboxes and free mail carefully (a wrong "Hi Info"
// is worse than a neutral "Hi there"). Values are SOFT defaults — anything the
// user actually supplies wins. Pure + client-safe: no server-only deps.
// ============================================================

// Local-parts that are clearly not a person.
const ROLE_LOCALS = new Set([
  "info", "hello", "hi", "hey", "admin", "sales", "support", "contact", "team", "office",
  "accounts", "enquiries", "enquiry", "help", "mail", "marketing", "noreply",
  "no-reply", "donotreply", "hr", "finance", "billing", "careers", "jobs", "press", "media",
  "founder", "ceo", "cto", "coo", "cfo", "director", "owner", "me", "dev", "hq",
  "webmaster", "postmaster", "newsletter", "news", "subscribe", "notifications",
]);

// Consumer mailbox providers → the domain tells us nothing about a company.
const FREE_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "hotmail.co.uk",
  "yahoo.com", "yahoo.co.uk", "ymail.com", "icloud.com", "me.com", "mac.com",
  "live.com", "live.co.uk", "aol.com", "protonmail.com", "proton.me", "gmx.com",
  "gmx.co.uk", "btinternet.com", "sky.com", "mail.com", "zoho.com",
]);

function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

export interface Identity {
  firstName: string | null; // null when we can't infer a real name
  company: string | null; // null for free-mail / role inboxes
  greeting: string; // always safe, e.g. "Hi Jane" or "Hi there"
}

/**
 * Best-effort identity from an email, with anything the user supplied taking
 * precedence. Never guesses a name for a role inbox; never guesses a company
 * for free mail.
 */
export function deriveIdentity(email: string, opts?: { firstName?: string | null; company?: string | null }): Identity {
  const providedName = (opts?.firstName || "").trim();
  const providedCompany = (opts?.company || "").trim();

  const [localRaw = "", domainRaw = ""] = String(email).toLowerCase().trim().split("@");
  const local = localRaw.replace(/\+.*$/, ""); // drop +tags
  const domain = domainRaw;

  // ---- First name ----
  let firstName: string | null = providedName ? titleCase(providedName.split(/\s+/)[0]) : null;
  if (!firstName && local && !ROLE_LOCALS.has(local)) {
    const segs = local.split(/[._-]+/).filter(Boolean);
    const hasSep = segs.length > 1;
    // "j.smith" (initial + surname) → don't greet someone by their surname.
    const initialSurname = hasSep && (segs[0]?.length ?? 0) === 1;
    const token = segs.find((t) => /^[a-z]{2,}$/.test(t) && !ROLE_LOCALS.has(t));
    // A single run-together local (no separators) longer than 12 chars is
    // likely a full name mashed together or a handle — safer not to guess.
    const mashedBlob = !hasSep && (token?.length ?? 0) > 12;
    if (token && !initialSurname && !mashedBlob) firstName = titleCase(token);
  }

  // ---- Company ----
  let company: string | null = providedCompany || null;
  if (!company && domain && !FREE_DOMAINS.has(domain)) {
    const core = domain.split(".")[0];
    if (core && core.length >= 2) company = titleCase(core);
  }

  return { firstName, company, greeting: firstName ? `Hi ${firstName}` : "Hi there" };
}
