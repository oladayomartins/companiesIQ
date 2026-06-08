// Billing summary for the in-app Settings → Billing section: plan/status/
// renewal from the subscriptions table, plus recent invoices fetched live from
// Stripe. Server-only; degrades to an empty summary without Stripe/customer.
import "server-only";
import Stripe from "stripe";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface Invoice {
  date: string | null;
  amount: number;
  currency: string;
  status: string;
  url: string | null;
  pdf: string | null;
}

export interface BillingSummary {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  hasCustomer: boolean;
  invoices: Invoice[];
}

const EMPTY: BillingSummary = { plan: "free", status: "inactive", currentPeriodEnd: null, hasCustomer: false, invoices: [] };

export async function getBillingSummary(user: User | null): Promise<BillingSummary> {
  if (!user) return EMPTY;
  const admin = getSupabaseAdmin();
  if (!admin) return EMPTY;

  let sub: { plan?: string; status?: string; current_period_end?: string | null; stripe_customer_id?: string | null } | null = null;
  try {
    const { data } = await admin
      .from("subscriptions")
      .select("plan,status,current_period_end,stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    sub = data;
  } catch {
    return EMPTY;
  }

  const summary: BillingSummary = {
    plan: sub?.plan ?? "free",
    status: sub?.status ?? "inactive",
    currentPeriodEnd: sub?.current_period_end ?? null,
    hasCustomer: !!sub?.stripe_customer_id,
    invoices: [],
  };

  const key = process.env.STRIPE_SECRET_KEY;
  if (key && sub?.stripe_customer_id) {
    try {
      const stripe = new Stripe(key);
      const list = await stripe.invoices.list({ customer: sub.stripe_customer_id, limit: 12 });
      summary.invoices = list.data.map((inv) => ({
        date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
        amount: (inv.amount_paid || inv.amount_due || 0) / 100,
        currency: (inv.currency || "gbp").toUpperCase(),
        status: inv.status || "—",
        url: inv.hosted_invoice_url || null,
        pdf: inv.invoice_pdf || null,
      }));
    } catch {
      /* leave invoices empty */
    }
  }
  return summary;
}
