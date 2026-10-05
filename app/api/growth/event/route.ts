// First-party funnel beacon: POST { event, plan?, billing?, ref? } from the
// browser (paywall seen, pricing viewed, plan chosen). Recorded only for
// signed-in accounts — anonymous hits get a 204 and are dropped, which is what
// keeps bots out of the Revenue funnel.
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { isClientEvent, recordGrowthEvent } from "@/lib/growth/events";

export const dynamic = "force-dynamic";

const clip = (v: unknown, n = 80) => (typeof v === "string" && v ? v.slice(0, n) : null);

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const event = String(body.event ?? "");
  if (!isClientEvent(event)) return NextResponse.json({ error: "Unknown event." }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 204 });

  await recordGrowthEvent({
    userId: user.id,
    event,
    plan: clip(body.plan, 20),
    billing: body.billing === "annual" ? "annual" : body.billing === "monthly" ? "monthly" : null,
    ref: clip(body.ref),
    meta: { path: clip(body.path, 200) },
  });
  return new NextResponse(null, { status: 204 });
}
