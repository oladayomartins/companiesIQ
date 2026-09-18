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

/**
 * The plan for a user id. Used where there is no User object — an API key
 * identifies a user id, not a session.
 */
export async function getUserPlanById(userId: string): Promise<string> {
  const admin = getSupabaseAdmin();
  if (!admin) return "free";
  try {
    const { data } = await admin.from("subscriptions").select("plan,status").eq("user_id", userId).maybeSingle();
    if (data && data.plan !== "free" && ACTIVE_STATUSES.has(data.status)) return data.plan;
    return "free";
  } catch {
    return "free";
  }
}

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

// ---- Contact discovery ------------------------------------------------------
//
// Unlike the other caps, this one costs real outbound requests to somebody
// else's web server on every miss, so it is METERED rather than a boolean: a
// plan buys N distinct companies per calendar month. Re-opening a company you
// already looked up this month is free, exactly as report_unlocks works — the
// unit a customer understands is "companies I researched", not "HTTP requests".

export interface ContactAllowance {
  allowed: boolean;
  limit: number; // -1 = unlimited
  used: number;
  remaining: number; // -1 = unlimited
  reason?: "signed-out" | "plan" | "quota";
}

const UNLIMITED: ContactAllowance = { allowed: true, limit: -1, used: 0, remaining: -1 };

const utcMonth = () => new Date().toISOString().slice(0, 7);

/**
 * What contact-discovery allowance this user has left this month, and whether
 * `number` is already inside it. Counting is by DISTINCT company per month, so
 * a repeat view never costs a second unit.
 */
export async function contactAllowance(user: User | null, number?: string): Promise<ContactAllowance> {
  if (!user) return { allowed: false, limit: 0, used: 0, remaining: 0, reason: "signed-out" };
  if (isAdmin(user) || isPartner(user)) return UNLIMITED;

  const limit = (await capsFor(user)).contactLookups;
  if (limit === 0) return { allowed: false, limit: 0, used: 0, remaining: 0, reason: "plan" };
  if (limit === -1) return UNLIMITED;

  const admin = getSupabaseAdmin();
  // Without the service role we cannot meter, and silently handing out an
  // unmetered allowance is the wrong failure: deny instead.
  if (!admin) return { allowed: false, limit, used: 0, remaining: 0, reason: "quota" };

  const month = utcMonth();
  const { data } = await admin
    .from("contact_lookups")
    .select("company_number")
    .eq("user_id", user.id)
    .eq("month", month);

  const rows = data ?? [];
  const used = rows.length;
  const alreadyCounted = !!number && rows.some((r: { company_number: string }) => r.company_number === number);
  const remaining = Math.max(0, limit - used);

  if (alreadyCounted) return { allowed: true, limit, used, remaining };
  return remaining > 0
    ? { allowed: true, limit, used, remaining }
    : { allowed: false, limit, used, remaining: 0, reason: "quota" };
}

/**
 * Record that this user looked up this company this month. Idempotent — the
 * primary key makes a repeat view a no-op rather than a second unit.
 */
export async function recordContactLookup(user: User | null, number: string): Promise<void> {
  if (!user || isAdmin(user) || isPartner(user)) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin
    .from("contact_lookups")
    .upsert({ user_id: user.id, company_number: number, month: utcMonth() }, { onConflict: "user_id,company_number,month" });
}
