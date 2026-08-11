// Financials backfill (cron target). Parses filed accounts (iXBRL) for a bounded
// batch of cached companies old enough to have filed, caching net worth /
// turnover / employees + the prior-year growth signal. Auth: INGEST_SECRET
// (manual) or CRON_SECRET (Vercel Cron). Paired with the weekly entry in
// vercel.json. Bounded per run to respect the Companies House rate limit.
import { NextRequest, NextResponse } from "next/server";
import { cronAuth } from "@/lib/cron-auth";
import { backfillFinancialsBatch, isFinancialsConfigured } from "@/lib/enrichment/financials";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = cronAuth(req.headers.get("authorization"));
  if (!auth.configured) return NextResponse.json({ error: "Cron secret not configured." }, { status: 503 });
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isFinancialsConfigured()) return NextResponse.json({ error: "Companies House key not set." }, { status: 503 });

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 60, 300);
  try {
    const result = await backfillFinancialsBatch(limit);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Backfill failed." }, { status: 502 });
  }
}
