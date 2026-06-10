// ============================================================
// Access control — the gate for Pro-tier features.
//
//   • Anonymous / free       → public preview only (the indexable profile).
//   • Active subscription    → full intelligence + Pro tools.
//   • Admin / partner        → complimentary full access (no paid sub).
//
// Reads the `subscriptions` table via the service role; degrades gracefully to
// "free" if Supabase admin isn't configured.
// ============================================================
import "server-only";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isAdmin, isPartner } from "@/lib/admin";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

/** The user's plan ("free" if none active). */
export async function getUserPlan(user: User | null): Promise<string> {
  if (!user) return "free";
  const admin = getSupabaseAdmin();
  if (!admin) return "free";
  try {
    const { data } = await admin.from("subscriptions").select("plan,status").eq("user_id", user.id).maybeSingle();
    if (data && data.plan !== "free" && ACTIVE_STATUSES.has(data.status)) return data.plan;
    return "free";
  } catch {
    return "free";
  }
}

/** True when the user has an active paid subscription (Pro features). */
export async function isSubscribed(user: User | null): Promise<boolean> {
  return (await getUserPlan(user)) !== "free";
}

/**
 * The gate used for all Pro-tier features (intelligence, Companies/Markets/
 * Industries, Watchlists/Alerts, full search results, report unlock).
 *
 * Admins and partners (e.g. DigitWarehouse) get full access WITHOUT a paid
 * subscription — they're complimentary internal/partner accounts. Everyone
 * else needs an active subscription. Keep BILLING display (Settings) on
 * isSubscribed so a comped account still reflects its true Stripe state.
 */
export async function hasProAccess(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (isAdmin(user) || isPartner(user)) return true;
  return isSubscribed(user);
}
