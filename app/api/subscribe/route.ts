// Subscription checkout for CompaniesIQ plans (Analyst / Team).
// POST { plan: "analyst"|"team", interval: "monthly"|"annual" } → { url }.
// Login-gated; reuses the user's Stripe customer if they've subscribed before.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getCurrentUser } from "@/lib/supabase/server";
import { priceIdFor, getStripeCustomerId, type BillingInterval } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { plan?: string; interval?: BillingInterval };
  const plan = body.plan ?? "";
  const interval: BillingInterval = body.interval === "annual" ? "annual" : "monthly";

  const key = process.env.STRIPE_SECRET_KEY;
  const price = priceIdFor(plan, interval);
  if (!key || !price) {
    return NextResponse.json({ error: "Subscriptions aren't available yet." }, { status: 503 });
  }

  try {
    const stripe = new Stripe(key);
    const origin = req.nextUrl.origin;
    const existingCustomer = await getStripeCustomerId(user.id);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/app?subscribed=1`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: user.id,
      ...(existingCustomer ? { customer: existingCustomer } : { customer_email: user.email ?? undefined }),
      // user_id + plan flow through to the webhook on both the session and the
      // subscription, so later subscription.updated/deleted events resolve too.
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
    });
    if (!session.url) return NextResponse.json({ error: "Checkout session has no URL." }, { status: 502 });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout failed." }, { status: 502 });
  }
}
