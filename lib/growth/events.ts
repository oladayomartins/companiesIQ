// ============================================================
// First-party funnel events (server-only).
//
// Written for signed-in accounts only, so the funnel built from them is free
// of the bot traffic that pollutes GA4. Best-effort like lib/audit.ts: a
// failed insert must never break the checkout or page it observes.
// ============================================================
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/** Events a browser may report (via /api/growth/event). */
export const CLIENT_EVENTS = [
  "paywall_view",
  "pricing_view",
  "upgrade_view",
  "plan_select",
  // On-site search — the demand signal Search Console can't give us per user.
  "search", // meta: q, intent, sector, region, place, results
  "search_filter", // refined the results (meta: filters)
  "search_capped", // results hidden behind the plan's row cap (meta: hidden, total)
  "gated_action", // clicked a paid action without the plan (ref: save_search | export | …)
  "save_search", // Pro: saved a search
  "export", // Pro: exported results
] as const;
/** Events only the server records (subscribe route, Stripe webhook). */
export const SERVER_EVENTS = ["checkout_started", "checkout_completed", "checkout_expired"] as const;

export type GrowthEventName = (typeof CLIENT_EVENTS)[number] | (typeof SERVER_EVENTS)[number];

export interface GrowthEventInput {
  userId: string;
  event: GrowthEventName;
  plan?: string | null;
  billing?: string | null;
  value?: number | null;
  ref?: string | null;
  meta?: Record<string, unknown> | null;
}

export function isClientEvent(e: string): e is (typeof CLIENT_EVENTS)[number] {
  return (CLIENT_EVENTS as readonly string[]).includes(e);
}

export async function recordGrowthEvent(e: GrowthEventInput): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    if (!admin || !e.userId) return;
    await admin.from("growth_events").insert({
      user_id: e.userId,
      event: e.event,
      plan: e.plan ?? null,
      billing: e.billing ?? null,
      value: e.value ?? null,
      ref: e.ref ? String(e.ref).slice(0, 200) : null,
      meta: e.meta ?? null,
    });
  } catch {
    /* analytics is best-effort */
  }
}
