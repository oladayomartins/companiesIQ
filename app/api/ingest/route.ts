// ============================================================
// Ingestion sync endpoint (the collection engine's cron target).
// Intended to run every 5–15 minutes: it pulls recently incorporated
// companies from Companies House, classifies them via the SIC and
// geographic engines, and upserts them into the internal register
// (Supabase `companies` table). Protected by INGEST_SECRET.
//
//   curl -H "Authorization: Bearer $INGEST_SECRET" \
//        https://app.companiesiq.co.uk/api/ingest
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { advancedSearch, getCompany, hasApiKey } from "@/lib/companies-house";
import { classifySic } from "@/lib/sic";
import { resolveGeo } from "@/lib/geography";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Run an async fn over items with a fixed concurrency cap. */
async function mapPool<T>(items: T[], concurrency: number, fn: (t: T) => Promise<void>): Promise<void> {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

export async function GET(req: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  const auth = req.headers.get("authorization");
  // Fail closed: in production a secret is required, and it must match.
  if (process.env.NODE_ENV === "production" && !secret) {
    return NextResponse.json({ error: "INGEST_SECRET must be set in production" }, { status: 503 });
  }
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  if (!hasApiKey()) {
    return NextResponse.json({ error: "COMPANIES_HOUSE_API_KEY not configured" }, { status: 503 });
  }

  // Pull companies incorporated in the last 2 days (the sync window).
  let fetched;
  try {
    fetched = await advancedSearch({
      incorporatedFrom: isoDaysAgo(2),
      incorporatedTo: isoDaysAgo(0),
      status: ["active"],
      size: 100,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Companies House error" }, { status: 502 });
  }

  const rows = fetched.results.map((r) => {
    const primary = r.sicCodes[0];
    const cls = primary ? classifySic(primary) : undefined;
    const geo = resolveGeo({});
    return {
      number: r.number,
      name: r.name,
      status: r.status,
      incorporated: r.incorporated || null,
      sic_codes: r.sicCodes,
      primary_sector: cls?.sector ?? null,
      primary_category: cls?.category ?? null,
      region: r.region ?? geo.region,
      updated_at: new Date().toISOString(),
    };
  });

  // Best-effort filing-date enrichment for this batch (capped + fault-tolerant
  // so it can never break the core ingest). The backfill script populates the
  // rest of the register; CH advanced-search doesn't return filing dates.
  const FILING_CAP = 40;
  await mapPool(rows.slice(0, FILING_CAP), 6, async (row) => {
    try {
      const c = await getCompany(row.number);
      Object.assign(row, {
        accounts_next_due: c.accounts?.nextDue ?? null,
        accounts_overdue: c.accounts?.overdue ?? null,
        accounts_last_made_up: c.accounts?.lastMadeUpTo ?? null,
        confirmation_next_due: c.confirmationStatement?.nextDue ?? null,
        confirmation_overdue: c.confirmationStatement?.overdue ?? null,
        filing_checked_at: new Date().toISOString(),
      });
    } catch {
      /* leave filing columns unset — backfill will fill them later */
    }
  });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ingested: 0,
      discovered: rows.length,
      stored: false,
      note: "Supabase not configured — discovered companies were classified but not persisted.",
      sample: rows.slice(0, 5),
    });
  }

  // System write to public.companies bypasses RLS via the service-role client.
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY required to persist ingested companies" }, { status: 503 });
  }
  const { error } = await supabase.from("companies").upsert(rows, { onConflict: "number" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ingested: rows.length, discovered: fetched.total, stored: true });
}
