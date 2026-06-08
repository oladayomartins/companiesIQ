// ============================================================
// Subscription billing helpers (server-only).
//
// Recurring price IDs are supplied via env so the same code runs against
// Stripe TEST keys (validate the flow) and then LIVE keys (go live) with no
// code change — just swap STRIPE_SECRET_KEY + the STRIPE_PRICE_* values.
// The webhook writes the resulting state into public.subscriptions via the
// service role; lib/access.ts reads it to gate the report.
// ============================================================
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type BillingInterval = "monthly" | "annual";

// plan → { interval → Stripe price id }. Only paid, self-serve tiers
// (Analyst, Team) are billable here; Enterprise is sales-led.
const PRICE_ENV: Record<string, Record<BillingInterval, string | undefined>> = {
  analyst: {
    monthly: process.env.STRIPE_PRICE_ANALYST_MONTHLY,
    annual: process.env.STRIPE_PRICE_ANALYST_ANNUAL,
  },
  team: {
    monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY,
    annual: process.env.STRIPE_PRICE_TEAM_ANNUAL,
  },
};

export function priceIdFor(plan: string, interval: BillingInterval): string | null {
  return PRICE_ENV[plan]?.[interval] ?? null;
}

/** Reverse lookup: which plan does a Stripe price id belong to? */
export function planForPriceId(priceId: string | null | undefined): string | null {
  if (!priceId) return null;
  for (const [plan, intervals] of Object.entries(PRICE_ENV)) {
    if (intervals.monthly === priceId || intervals.annual === priceId) return plan;
  }
  return null;
}

export interface SubscriptionRow {
  user_id: string;
  plan: string;
  status: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  current_period_end?: string | null;
}

/** Upsert the user's subscription row (service role; called from the webhook). */
export async function upsertSubscription(row: SubscriptionRow): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin
    .from("subscriptions")
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
}

/** The user's existing Stripe customer id, if they've checked out before. */
export async function getStripeCustomerId(userId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.stripe_customer_id ?? null;
}
