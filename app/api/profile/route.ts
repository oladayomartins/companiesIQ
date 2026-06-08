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

  const body = (await req.json().catch(() => ({}))) as { full_name?: string };
  const full_name = (body.full_name || "").trim().slice(0, 120);
  try {
    await admin.from("profiles").upsert({ id: user.id, email: user.email, full_name }, { onConflict: "id" });
    return NextResponse.json({ ok: true, full_name });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Save failed." }, { status: 400 });
  }
}
