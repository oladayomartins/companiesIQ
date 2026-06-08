// Stripe billing portal — lets a subscribed user manage / cancel their plan.
// POST → { url }. Login-gated; needs a Stripe customer on file.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getCurrentUser } from "@/lib/supabase/server";
import { getStripeCustomerId } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const key = process.env.STRIPE_SECRET_KEY;
  const customer = await getStripeCustomerId(user.id);
  if (!key || !customer) {
    return NextResponse.json({ error: "No active subscription to manage." }, { status: 503 });
  }

  try {
    const stripe = new Stripe(key);
    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${req.nextUrl.origin}/app`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Portal failed." }, { status: 502 });
  }
}
