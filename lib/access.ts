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
import { planById, type Plan, type PlanId } from "@/lib/subscription";

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

// ---- Per-plan capabilities ---------------------------------------------------
//
// hasProAccess() answers "has any paid plan", which is the right gate for the
// paywall but the wrong one for everything above it: used alone it hands an
// Analyst every Team feature. These read the caps that lib/subscription.ts has
// always declared but that nothing enforced, so a plan's promises and its
// behaviour are the same thing.
//
// Admins and partners are comped throughout, exactly as with hasProAccess.

async function capsFor(user: User): Promise<Plan["caps"]> {
  return planById((await getUserPlan(user)) as PlanId).caps;
}

/** Real-time signal alerts — sold on Team and above, not on Analyst. */
export async function canUseAlerts(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (isAdmin(user) || isPartner(user)) return true;
  return (await capsFor(user)).alerts;
}

/** CSV export of reports, searches and lists — Analyst and above. */
export async function canExportCsv(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (isAdmin(user) || isPartner(user)) return true;
  return (await capsFor(user)).csvExport;
}

/** Full filing history. Free accounts see a recent window instead. */
export async function canUseHistoricalData(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (isAdmin(user) || isPartner(user)) return true;
  return (await capsFor(user)).historicalData;
}

/** How many watchlists a plan may keep. -1 means unlimited. */
export async function watchlistLimit(user: User | null): Promise<number> {
  if (!user) return 0;
  if (isAdmin(user) || isPartner(user)) return -1;
  return (await capsFor(user)).watchlists;
}

/** Companies per watchlist on the entry paid plan, as the pricing page states. */
export const WATCHLIST_COMPANY_LIMIT = 50;

/** Free accounts see this many of the most recent filings; paid sees all. */
export const FREE_FILING_WINDOW = 10;
