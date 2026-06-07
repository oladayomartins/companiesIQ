// Stripe Checkout for the DigitWarehouse funnel packages.
//   /api/checkout?price=<priceId>&company=<number>&source=<partner>
// Creates a one-time Checkout Session and redirects to Stripe. Degrades to the
// partner's booking link if Stripe isn't configured yet. Only allowlisted
// package price IDs are accepted (no arbitrary-price abuse).
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { isKnownPriceId, getPartner } from "@/lib/partners";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const price = sp.get("price") || "";
  const company = sp.get("company") || "";
  const source = sp.get("source") || "digitwarehouse";
  const origin = req.nextUrl.origin;

  if (!price || !isKnownPriceId(price)) {
    return NextResponse.json({ error: "Unknown package price." }, { status: 400 });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Not configured yet — send them to book a call rather than erroring.
    return NextResponse.redirect(getPartner(source).bookingUrl, 302);
  }

  try {
    const stripe = new Stripe(key);
    const back = `${origin}/company/${encodeURIComponent(company)}/growth-report?source=${encodeURIComponent(source)}`;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      success_url: `${back}&purchase=success`,
      cancel_url: back,
      metadata: { company, source },
    });
    if (!session.url) return NextResponse.json({ error: "Checkout session has no URL." }, { status: 502 });
    return NextResponse.redirect(session.url, 303);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout failed." }, { status: 502 });
  }
}
