// ============================================================
// Report access control — the Public → Free Account → Paid ladder.
//
//   • Anonymous (logged-out)  → preview only (the indexable public profile).
//   • Free account            → FREE_REPORTS_PER_MONTH full reports / calendar
//                               month (distinct companies; re-opening one you
//                               already opened this month is free), then locked.
//   • Active subscription     → unlimited full reports.
//
// Metering is server-side via the service role (RLS-locked tables). It degrades
// gracefully: if Supabase admin isn't configured, or the tables don't exist yet
// (migration not applied), logged-in users are treated as free-within-quota and
// NOT blocked — so the app never breaks on a missing dependency.
// ============================================================
import "server-only";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isAdmin, isPartner } from "@/lib/admin";

export const FREE_REPORTS_PER_MONTH = 1;

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

export type ReportAccess =
  | { state: "anonymous"; unlocked: false }
  | { state: "subscribed"; unlocked: true; plan: string }
  | { state: "free_unlocked"; unlocked: true; used: number; limit: number }
  | { state: "free_quota_exceeded"; unlocked: false; used: number; limit: number };

/** Current UTC month as 'YYYY-MM'. */
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function resolveReportAccess(user: User | null, companyNumber: string): Promise<ReportAccess> {
  if (!user) return { state: "anonymous", unlocked: false };

  const admin = getSupabaseAdmin();
  // No service-role client (local dev / not configured): don't meter, don't block.
  if (!admin) return { state: "free_unlocked", unlocked: true, used: 0, limit: FREE_REPORTS_PER_MONTH };

  try {
    // 1. Active subscription → unlimited.
    const { data: sub } = await admin
      .from("subscriptions")
      .select("plan,status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (sub && sub.plan !== "free" && ACTIVE_STATUSES.has(sub.status)) {
      return { state: "subscribed", unlocked: true, plan: sub.plan };
    }

    // 2. Free account → meter distinct companies this month.
    const month = currentMonth();
    const { data: existing } = await admin
      .from("report_unlocks")
      .select("company_number")
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("company_number", companyNumber)
      .maybeSingle();
    const { count } = await admin
      .from("report_unlocks")
      .select("company_number", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("month", month);
    const used = count ?? 0;

    // Already opened this company this month → free, no extra charge.
    if (existing) return { state: "free_unlocked", unlocked: true, used, limit: FREE_REPORTS_PER_MONTH };

    if (used < FREE_REPORTS_PER_MONTH) {
      // Consume one unlock. Ignore a duplicate-key race (counts as already-open).
      await admin.from("report_unlocks").insert({ user_id: user.id, company_number: companyNumber, month });
      return { state: "free_unlocked", unlocked: true, used: used + 1, limit: FREE_REPORTS_PER_MONTH };
    }

    return { state: "free_quota_exceeded", unlocked: false, used, limit: FREE_REPORTS_PER_MONTH };
  } catch {
    // Tables not migrated yet or a transient error — fail open for logged-in
    // users rather than breaking the report.
    return { state: "free_unlocked", unlocked: true, used: 0, limit: FREE_REPORTS_PER_MONTH };
  }
}
