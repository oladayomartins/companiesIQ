// Update the signed-in user's profile (display name). Service-role write,
// scoped to the authenticated user's own row.
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { full_name?: string; company?: string; onboarded?: boolean };
  // Only touch the fields that were supplied, so a Settings save (name only)
  // never clears company, and onboarding can set both + mark the flag.
  const row: Record<string, unknown> = { id: user.id, email: user.email };
  if (typeof body.full_name === "string") row.full_name = body.full_name.trim().slice(0, 120);
  if (typeof body.company === "string") row.company = body.company.trim().slice(0, 120);
  if (body.onboarded === true) row.onboarded_at = new Date().toISOString();
  try {
    await admin.from("profiles").upsert(row, { onConflict: "id" });
    return NextResponse.json({ ok: true, full_name: row.full_name ?? null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Save failed." }, { status: 400 });
  }
}
