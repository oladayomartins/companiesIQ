// ============================================================
// Director contacts — third-party enrichment (off by default)
// ------------------------------------------------------------
// The one exception to contact.ts's rule 1 ("nothing is bought"): a director's
// business email / direct dial from a provider behind CONTACT_ENRICH_URL. It is
// kept deliberately inside the same machinery as company contacts so it is held
// to the same standards everywhere it can be:
//
//   • Output is ContactPoint[] with the checks that were (and were NOT) run, so
//     the report's evidence UI shows exactly how little we can vouch for it.
//   • Confidence is capped at MEDIUM: a provider's "high" is the vendor's claim,
//     not a check we ran, and "high" here means seen on the company's own site.
//   • The contact_suppressions opt-out is applied on read AND write.
//   • Metering (contact_lookups) and audit (audit_events) are the shared ones —
//     see lib/access.ts and app/api/contacts/director/[officerId].
//   • No provider → status "not_configured", every list empty. Never a guess.
//
// Provider contract (vendor-neutral; put Apollo / Lusha / Cognism / Hunter
// behind a thin proxy):  POST {officerId, name, companies[]} →
// {email, phone, emailConfidence, phoneConfidence, provider}, any field null.
//
// Server-only. See docs/contact-enrichment.md §10.
// ============================================================
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { normalizePhone } from "./phone";
import { suppressedValues } from "./contact";
import { CHECKS, roleOf, type ContactCheck, type ContactKind, type ContactPoint, type DirectorContacts } from "./contact-types";

export type { DirectorContacts } from "./contact-types";

/** Re-enrich after this long. Longer than company contacts (30d): every miss is paid. */
const CACHE_TTL_DAYS = 90;
const EMAIL_VALID = /^[a-z0-9._%+-]{1,64}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;

type ProviderConfidence = "high" | "low" | "none";

/** True when a contact-enrichment provider is wired up. Gates the whole feature. */
export function isContactEnrichConfigured(): boolean {
  return !!process.env.CONTACT_ENRICH_URL;
}

export interface DirectorEnrichInput {
  officerId: string;
  name: string;
  companies: { name: string; number: string }[]; // context to help the provider match
}

/** What the provider returned, canonicalised — the shape we cache. */
interface RawContact {
  email: string | null;
  emailConfidence: ProviderConfidence | null;
  phone: string | null; // E.164
  phoneConfidence: ProviderConfidence | null;
  provider: string | null;
}

function normConfidence(v: unknown): ProviderConfidence | null {
  return v === "high" || v === "low" || v === "none" ? v : null;
}

function canonical(r: Partial<Record<keyof RawContact, unknown>> | null): RawContact {
  const email = typeof r?.email === "string" && EMAIL_VALID.test(r.email.trim()) ? r.email.trim().toLowerCase() : null;
  const phone = typeof r?.phone === "string" ? normalizePhone(r.phone).e164 : null;
  return {
    email,
    emailConfidence: email ? normConfidence(r?.emailConfidence) : null,
    phone,
    phoneConfidence: phone ? normConfidence(r?.phoneConfidence) : null,
    provider: typeof r?.provider === "string" ? r.provider.slice(0, 60) : null,
  };
}

// ---- Provider call (BYO webhook/proxy) ----
async function callProvider(input: DirectorEnrichInput): Promise<RawContact | null> {
  const url = process.env.CONTACT_ENRICH_URL;
  if (!url) return null;
  const key = process.env.CONTACT_ENRICH_KEY;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(12_000), // the reveal is interactive
    });
    if (!res.ok) return null;
    return canonical((await res.json()) as Partial<Record<keyof RawContact, unknown>>);
  } catch {
    return null; // network/timeout → nothing found, never a fabricated value
  }
}

// ---- ContactPoint construction ----

/**
 * One provider value as a ContactPoint. Only syntax is something we checked;
 * the provider's match claim is reported but unweighted, and the on-site and
 * mailbox/line checks are shown as NOT run rather than quietly omitted.
 */
function toPoint(kind: ContactKind, value: string, conf: ProviderConfidence | null): ContactPoint {
  const checks: ContactCheck[] = [
    { ...pick(CHECKS.syntax), passed: true },
    { ...pick(CHECKS.providerMatch), passed: conf === "high" ? true : conf ? false : null },
    { ...pick(CHECKS.onSite), passed: null },
    { ...pick(kind === "email" ? CHECKS.mailbox : CHECKS.line), passed: null },
  ];
  return {
    kind,
    value,
    display: kind === "phone" ? normalizePhone(value).display ?? value : value,
    role: kind === "email" ? roleOf(value) : "personal",
    sources: ["provider"],
    foundOn: [],
    checks,
    // Capped at medium — see the header. Score only orders the list.
    score: conf === "high" ? 55 : conf === "low" ? 30 : 15,
    confidence: conf === "high" ? "medium" : "low",
  };
}

const pick = (c: { id: string; label: string }) => ({ id: c.id, label: c.label });

async function toResult(input: { officerId: string; name: string | null }, raw: RawContact, checkedAt: string, cached: boolean): Promise<DirectorContacts> {
  const blocked = await suppressedValues([raw.email, raw.phone].filter(Boolean) as string[]);
  const email = raw.email && !blocked.has(raw.email) ? raw.email : null;
  const phone = raw.phone && !blocked.has(raw.phone) ? raw.phone : null;
  const notes = blocked.size ? ["Some details were withheld at the request of their owner."] : [];
  return {
    officerId: input.officerId,
    name: input.name,
    status: email || phone ? "measured" : "not_found",
    emails: email ? [toPoint("email", email, raw.emailConfidence)] : [],
    phones: phone ? [toPoint("phone", phone, raw.phoneConfidence)] : [],
    provider: raw.provider,
    notes,
    checkedAt,
    cached,
  };
}

// ---- Cache (director_contacts) ----

async function readCache(officerId: string): Promise<{ name: string | null; raw: RawContact; checkedAt: string } | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin.from("director_contacts").select("*").eq("officer_id", officerId).maybeSingle();
  if (!data) return null;
  const checkedAt = data.fetched_at as string;
  if (!(Date.now() - Date.parse(checkedAt) < CACHE_TTL_DAYS * 86_400_000)) return null;
  return {
    name: (data.name as string) ?? null,
    raw: canonical({
      email: data.email,
      emailConfidence: data.email_confidence,
      phone: data.phone,
      phoneConfidence: data.phone_confidence,
      provider: data.provider,
    }),
    checkedAt,
  };
}

async function writeCache(officerId: string, name: string, raw: RawContact, checkedAt: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin.from("director_contacts").upsert(
    {
      officer_id: officerId,
      name,
      email: raw.email,
      email_confidence: raw.emailConfidence,
      phone: raw.phone,
      phone_confidence: raw.phoneConfidence,
      provider: raw.provider,
      source: "Third-party contact enrichment",
      fetched_at: checkedAt,
      updated_at: checkedAt,
    },
    { onConflict: "officer_id" },
  );
}

/**
 * A director's contact details, cache-first. A miss calls the provider (a paid
 * call — the caller meters it). Never throws; never returns a guessed value.
 */
export async function getDirectorContacts(input: DirectorEnrichInput): Promise<DirectorContacts> {
  if (!isContactEnrichConfigured()) {
    return { officerId: input.officerId, name: input.name, status: "not_configured", emails: [], phones: [], provider: null, notes: [], checkedAt: null, cached: false };
  }

  const cached = await readCache(input.officerId).catch(() => null);
  if (cached) return toResult({ officerId: input.officerId, name: cached.name ?? input.name }, cached.raw, cached.checkedAt, true);

  const now = new Date().toISOString();
  const raw = (await callProvider(input)) ?? canonical(null);

  // Suppression applies at write time too: never store a value someone asked us
  // not to show. And only cache a hit, so a transient miss isn't pinned for 90d.
  const blocked = await suppressedValues([raw.email, raw.phone].filter(Boolean) as string[]);
  const storable: RawContact = {
    ...raw,
    email: raw.email && !blocked.has(raw.email) ? raw.email : null,
    emailConfidence: raw.email && !blocked.has(raw.email) ? raw.emailConfidence : null,
    phone: raw.phone && !blocked.has(raw.phone) ? raw.phone : null,
    phoneConfidence: raw.phone && !blocked.has(raw.phone) ? raw.phoneConfidence : null,
  };
  if (storable.email || storable.phone) await writeCache(input.officerId, input.name, storable, now).catch(() => {});

  return toResult(input, raw, now, false);
}
