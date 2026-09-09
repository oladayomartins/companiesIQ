// ============================================================
// Director contact enrichment — provider-agnostic (BYO) adapter
// ------------------------------------------------------------
// Turns a Companies House officer into a business email / direct dial by
// calling a THIRD-PARTY provider. This is the enrichment layer — fenced off
// from the register (Companies House / ONS / Nomis), with its own source label.
//
// Design principles (match the rest of lib/enrichment):
//   • Evidence-first: every value is a measured provider response with a
//     confidence, or null = "Not Assessed". We NEVER guess an email/phone.
//   • Graceful degradation: if no provider is configured, every field is null
//     and the feature stays dark. Nothing is fabricated, nothing breaks.
//   • Cache once, serve many: we pay the provider once per director and cache
//     the result (director_contacts) until it goes stale.
//   • Compliance-aware: phone numbers are returned but the UI must remind users
//     to screen against TPS/CTPS before calling (PECR). All reveals are audited.
//
// Provider integration is intentionally vendor-neutral: point CONTACT_ENRICH_URL
// at any provider behind a thin proxy (Apollo, Lusha, Cognism, Hunter, your own
// function). The proxy receives {officerId, name, companies[]} and returns the
// normalised shape below. Swap providers without touching product code.
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { MatchConfidence, DirectorContact } from "./types";

const CACHE_TTL_DAYS = 90; // re-enrich after this many days
const SOURCE_LABEL = "Third-party contact enrichment";

/** True when a contact-enrichment provider is wired up. Gates the whole feature. */
export function isContactEnrichConfigured(): boolean {
  return !!process.env.CONTACT_ENRICH_URL;
}

function normConfidence(v: unknown): MatchConfidence | null {
  return v === "high" || v === "low" || v === "none" ? v : null;
}

interface EnrichInput {
  officerId: string;
  name: string;
  companies: { name: string; number: string }[]; // context to help the provider match
}

interface ProviderResult {
  email?: string | null;
  phone?: string | null;
  emailConfidence?: string | null;
  phoneConfidence?: string | null;
  provider?: string | null;
}

// ---- Provider call (BYO webhook/proxy) ----
async function callProvider(input: EnrichInput): Promise<ProviderResult | null> {
  const url = process.env.CONTACT_ENRICH_URL;
  if (!url) return null; // not configured → Not Assessed
  const key = process.env.CONTACT_ENRICH_KEY;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(key ? { authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify(input),
      // keep it snappy; the reveal is interactive
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as ProviderResult;
  } catch {
    return null; // network/timeout → Not Assessed, never a fabricated value
  }
}

// ---- Cache ----
function fresh(fetchedAt: string): boolean {
  const t = Date.parse(fetchedAt);
  return Number.isFinite(t) && Date.now() - t < CACHE_TTL_DAYS * 86_400_000;
}

async function readCache(officerId: string): Promise<DirectorContact | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin.from("director_contacts").select("*").eq("officer_id", officerId).maybeSingle();
  if (!data || !fresh(data.fetched_at as string)) return null;
  return {
    officerId,
    name: (data.name as string) ?? null,
    email: (data.email as string) ?? null,
    emailConfidence: normConfidence(data.email_confidence),
    phone: (data.phone as string) ?? null,
    phoneConfidence: normConfidence(data.phone_confidence),
    provider: (data.provider as string) ?? null,
    source: (data.source as string) ?? SOURCE_LABEL,
    checkedAt: (data.fetched_at as string) ?? null,
    cached: true,
  };
}

async function writeCache(c: DirectorContact): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const now = new Date().toISOString();
  await admin.from("director_contacts").upsert(
    {
      officer_id: c.officerId,
      name: c.name,
      email: c.email,
      email_confidence: c.emailConfidence,
      phone: c.phone,
      phone_confidence: c.phoneConfidence,
      provider: c.provider,
      source: c.source,
      fetched_at: now,
      updated_at: now,
    },
    { onConflict: "officer_id" },
  );
}

const notAssessed = (officerId: string, name: string): DirectorContact => ({
  officerId,
  name,
  email: null,
  emailConfidence: null,
  phone: null,
  phoneConfidence: null,
  provider: null,
  source: SOURCE_LABEL,
  checkedAt: null,
  cached: false,
});

/**
 * Enrich a director's contact details. Cache hit → served instantly. Otherwise
 * calls the configured provider, caches, and returns. No provider or no match →
 * an all-null "Not Assessed" result (never a guessed value).
 */
export async function enrichDirectorContact(input: EnrichInput): Promise<DirectorContact> {
  const cached = await readCache(input.officerId);
  if (cached) return cached;

  if (!isContactEnrichConfigured()) return notAssessed(input.officerId, input.name);

  const r = await callProvider(input);
  const contact: DirectorContact = {
    officerId: input.officerId,
    name: input.name,
    email: r?.email ?? null,
    emailConfidence: normConfidence(r?.emailConfidence),
    phone: r?.phone ?? null,
    phoneConfidence: normConfidence(r?.phoneConfidence),
    provider: r?.provider ?? null,
    source: SOURCE_LABEL,
    checkedAt: new Date().toISOString(),
    cached: false,
  };
  // Only cache a result that actually returned something, so a transient
  // provider miss doesn't get pinned for 90 days.
  if (contact.email || contact.phone) await writeCache(contact);
  return contact;
}

/** Accountability log: record that `userId` revealed `officerId`'s contact. */
export async function logContactReveal(officerId: string, userId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin.from("contact_reveals").insert({ officer_id: officerId, user_id: userId });
}
