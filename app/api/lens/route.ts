// Saves the user's default lens (what they sell) to their profile.
//
// Pro-only: everyone can switch lens per session from the client, but pinning a
// default is a paid convenience. The free-text "other" is stored alongside as
// roadmap input — which weighting to build next, ranked by demand.
import { NextResponse } from "next/server";
import { getCurrentUser, getSupabaseAdmin } from "@/lib/supabase/server";
import { hasProAccess } from "@/lib/access";
import { PROFILE_BY_KEY } from "@/lib/lens";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await hasProAccess(user))) return NextResponse.json({ error: "Pro required" }, { status: 403 });

  let body: { profile?: string; other?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const profile = body.profile ?? "";
  if (!PROFILE_BY_KEY[profile]) return NextResponse.json({ error: "Unknown lens" }, { status: 400 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const other = typeof body.other === "string" ? body.other.trim().slice(0, 200) || null : null;
  const { error } = await admin
    .from("profiles")
    .update({ lens_profile: profile, lens_other: other })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: "Save failed" }, { status: 500 });

  return NextResponse.json({ ok: true, profile });
}
