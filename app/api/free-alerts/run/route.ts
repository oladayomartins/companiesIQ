// Weekly free-alert digest (cron target). Sends each active subscriber the new
// companies matching their sector/region. Auth: INGEST_SECRET (manual) or
// CRON_SECRET (Vercel Cron). Pair with the weekly entry in vercel.json.
import { NextRequest, NextResponse } from "next/server";
import { cronAuth } from "@/lib/cron-auth";
import { runFreeAlertDigest } from "@/lib/free-alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = cronAuth(req.headers.get("authorization"));
  if (!auth.configured) return NextResponse.json({ error: "Cron secret not configured." }, { status: 503 });
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const result = await runFreeAlertDigest();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Digest failed." }, { status: 502 });
  }
}
