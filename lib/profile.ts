// ============================================================
// Profile helpers — names + greetings (server-only)
// ------------------------------------------------------------
// Wraps the public.profiles table. A greeting is always available: the user's
// saved name if they've set one (Settings, or the name Stripe captured at
// checkout), otherwise a best-effort first name derived from their email
// (lib/identity.ts). So the app is personalized from the first visit.
// ============================================================
import "server-only";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { deriveIdentity } from "@/lib/identity";

/** The user's saved full name, or null if none set. */
export async function getFullName(userId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  const n = ((data?.full_name as string | undefined) || "").trim();
  return n || null;
}

/** First name + safe greeting: saved name first, else derived from the email. */
export async function getGreeting(user: User | null): Promise<{ firstName: string | null; greeting: string }> {
  if (!user) return { firstName: null, greeting: "Hi there" };
  const full = await getFullName(user.id).catch(() => null);
  if (full) {
    const first = full.split(/\s+/)[0];
    return { firstName: first, greeting: `Hi ${first}` };
  }
  const id = deriveIdentity(user.email ?? "");
  return { firstName: id.firstName, greeting: id.greeting };
}

/**
 * Whether to show the first-run onboarding prompt: only when the user has no
 * saved name AND hasn't already completed/skipped it (onboarded_at). Returns
 * email-derived suggestions to pre-fill the fields.
 */
export async function getOnboardingState(
  user: User | null,
): Promise<{ needs: boolean; suggestedName: string; suggestedCompany: string }> {
  const empty = { needs: false, suggestedName: "", suggestedCompany: "" };
  if (!user) return empty;
  const admin = getSupabaseAdmin();
  if (!admin) return empty;
  let full: string | null = null;
  let onboardedAt: string | null = null;
  try {
    const { data } = await admin.from("profiles").select("full_name, onboarded_at").eq("id", user.id).maybeSingle();
    full = ((data?.full_name as string | undefined) || "").trim() || null;
    onboardedAt = (data?.onboarded_at as string | undefined) || null;
  } catch {
    return empty;
  }
  const id = deriveIdentity(user.email ?? "");
  return { needs: !full && !onboardedAt, suggestedName: id.firstName ?? "", suggestedCompany: id.company ?? "" };
}

/**
 * Save a name captured at Stripe checkout — but NEVER overwrite a name the user
 * has already set themselves. Best-effort; called from the webhook.
 */
export async function setProfileNameIfEmpty(userId: string, email: string | null, name: string | null): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin || !userId) return;
  const cleaned = (name || "").trim().slice(0, 120);
  if (!cleaned) return;
  try {
    const { data } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    if (!data) {
      await admin.from("profiles").insert({ id: userId, email, full_name: cleaned });
    } else if (!((data.full_name as string | null) || "").trim()) {
      await admin.from("profiles").update({ full_name: cleaned }).eq("id", userId);
    }
  } catch {
    /* best-effort — never block the webhook */
  }
}

/**
 * The user's saved default lens (what they sell), or null. Read on the company
 * report so a Pro user's pinned choice wins over the per-session default; the
 * client still overrides it with a session switch from localStorage.
 */
export async function getSavedLens(userId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  try {
    const { data } = await admin.from("profiles").select("lens_profile").eq("id", userId).maybeSingle();
    const v = ((data?.lens_profile as string | undefined) || "").trim();
    return v || null;
  } catch {
    // Column not provisioned yet (supabase/profiles-lens.sql) — no default.
    return null;
  }
}
