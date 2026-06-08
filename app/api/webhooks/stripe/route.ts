// Stripe webhook — two flows, distinguished by event/mode:
//   • DigitWarehouse one-time package (mode "payment") → funnel purchase + lead.
//   • CompaniesIQ subscription (mode "subscription" + subscription.* events) →
//     upsert public.subscriptions so lib/access.ts unlocks the report.
// Signature-verified (STRIPE_WEBHOOK_SECRET). Must read the raw body for
// verification, so no JSON parsing before constructEvent.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { markPurchased, recordFunnelEvent } from "@/lib/leads";
import { upsertSubscription, planForPriceId } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

// In recent Stripe API versions the billing period moved to the subscription
// item level (multi-item subscriptions can bill on different cycles).
function periodEndIso(sub: Stripe.Subscription): string | null {
  const ts = sub.items?.data?.[0]?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret) {
    // Not configured — acknowledge so Stripe doesn't disable the endpoint.
    return NextResponse.json({ received: false, reason: "not configured" });
  }

  const sig = req.headers.get("stripe-signature") || "";
  const raw = await req.text();
  const stripe = new Stripe(key);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `Signature verification failed: ${e instanceof Error ? e.message : "unknown"}` }, { status: 400 });
  }

  // --- Subscription lifecycle (CompaniesIQ plans) ---
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.user_id;
    if (userId) {
      const plan = planForPriceId(sub.items.data[0]?.price?.id) ?? sub.metadata?.plan ?? "analyst";
      const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status;
      await upsertSubscription({
        user_id: userId,
        plan,
        status,
        stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        stripe_subscription_id: sub.id,
        current_period_end: periodEndIso(sub),
      });
    }
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // CompaniesIQ subscription → activate the user's plan.
    if (session.mode === "subscription") {
      const userId = session.client_reference_id || session.metadata?.user_id || "";
      const plan = session.metadata?.plan || "analyst";
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
      let status = "active";
      let periodEnd: string | null = null;
      if (subId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subId);
          status = sub.status;
          periodEnd = periodEndIso(sub);
        } catch {
          /* keep defaults */
        }
      }
      if (userId) {
        await upsertSubscription({
          user_id: userId,
          plan,
          status,
          stripe_customer_id: customerId,
          stripe_subscription_id: subId,
          current_period_end: periodEnd,
        });
      }
      return NextResponse.json({ received: true });
    }

    // DigitWarehouse one-time package purchase → funnel tracking.
    const company = session.metadata?.company || "";
    const source = session.metadata?.source || undefined;
    const email = session.customer_details?.email ?? session.customer_email ?? null;
    if (company) {
      await recordFunnelEvent(company, "purchase", source);
      await markPurchased(company, email);
    }
  }

  return NextResponse.json({ received: true });
}
