// Record how a NEW account's signup visit started: landing page, external
// referrer, UTM tags (from lib/growth/visit.ts). Written once, only for an
// account created within the last hour, so a returning user can never
// overwrite or be mis-attributed. Powers "where signups come from" on the
// admin Revenue screen.
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const str = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 204 });
  if (!user.created_at || Date.now() - Date.parse(user.created_at) > 60 * 60_000) {
    return new NextResponse(null, { status: 204 }); // not a new account
  }
  const admin = getSupabaseAdmin();
  if (!admin) return new NextResponse(null, { status: 204 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const landing = str(body.landing, 200);
  if (!landing || !landing.startsWith("/")) return NextResponse.json({ error: "landing required" }, { status: 400 });
  const utmIn = body.utm && typeof body.utm === "object" ? (body.utm as Record<string, unknown>) : {};
  const utm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const v = str(utmIn[k], 100);
    if (v) utm[k] = v;
  }

  // Only fill an empty record — first write wins, so a second tab can't overwrite it.
  await admin
    .from("profiles")
    .update({ signup_landing: landing, signup_referrer: str(body.referrer, 120), signup_utm: utm })
    .eq("id", user.id)
    .is("signup_landing", null);
  return new NextResponse(null, { status: 204 });
}
