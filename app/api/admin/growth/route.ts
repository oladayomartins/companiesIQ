// Admin actions for the Revenue screen (ADMIN_EMAILS only):
//   { action: "set_mode", mode: "off" | "dry_run" | "live" }
//   { action: "run" }                        → run the autopilot now
//   { action: "import_gsc", csv: "<text>" }  → store a Search Console export
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getSupabaseAdmin } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { runAutopilot } from "@/lib/growth/engine";
import { parseGscExport } from "@/lib/growth/search-console";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MODES = new Set(["off", "dry_run", "live"]);
const MAX_CSV = 2_000_000; // GSC exports cap at 1,000 rows — this is generous

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase service role not configured." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { action?: string; mode?: string; csv?: string };

  try {
    if (body.action === "set_mode") {
      if (!body.mode || !MODES.has(body.mode)) return NextResponse.json({ error: "Unknown mode." }, { status: 400 });
      const { error } = await admin
        .from("growth_settings")
        .upsert({ id: 1, mode: body.mode, updated_by: user!.email, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, mode: body.mode });
    }

    if (body.action === "run") {
      const result = await runAutopilot({ trigger: `manual:${user!.email}` });
      return NextResponse.json({ ok: true, result });
    }

    if (body.action === "import_gsc") {
      const csv = String(body.csv ?? "");
      if (!csv || csv.length > MAX_CSV) return NextResponse.json({ error: "Upload a Search Console CSV export." }, { status: 400 });
      const { kind, rows } = parseGscExport(csv);
      if (!rows.length) return NextResponse.json({ error: "No rows found in that file." }, { status: 400 });
      const { error } = await admin
        .from("search_console_imports")
        .insert({ kind, rows: rows.slice(0, 5000), row_count: rows.length, imported_by: user!.email });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, kind, rows: rows.length });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed." }, { status: 500 });
  }
}
