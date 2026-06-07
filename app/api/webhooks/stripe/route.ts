// Stripe webhook — records a "purchase" funnel event and marks the lead on a
// completed checkout. Signature-verified (STRIPE_WEBHOOK_SECRET). Must read the
// raw body for verification, so no JSON parsing before constructEvent.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { markPurchased, recordFunnelEvent } from "@/lib/leads";

export const dynamic = "force-dynamic";

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
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
