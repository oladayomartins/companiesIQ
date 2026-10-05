// Revenue Autopilot — daily cron target. Auth: INGEST_SECRET (manual) or
// CRON_SECRET (Vercel Cron). What it does depends on the mode set on the admin
// Revenue screen (off / dry_run / live) — see lib/growth/engine.ts.
import { NextRequest, NextResponse } from "next/server";
import { cronAuth } from "@/lib/cron-auth";
import { runAutopilot } from "@/lib/growth/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = cronAuth(req.headers.get("authorization"));
  if (!auth.configured) return NextResponse.json({ error: "Cron secret not configured." }, { status: 503 });
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const result = await runAutopilot({ trigger: "cron" });
    return NextResponse.json({ ok: true, ...result, actions: result.actions.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Autopilot failed." }, { status: 502 });
  }
}
