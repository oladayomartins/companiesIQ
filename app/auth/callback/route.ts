import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

// Exchanges the magic-link / OAuth code for a session, then redirects into the
// app. On any failure we send the user back to /sign-in with a reason so the UI
// can explain what happened instead of silently showing an empty form.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") || "/app";

  // Supabase reports verify failures (expired/used link) in the URL *hash*
  // (#error=…), which never reaches the server — so a request with no code is
  // a failed/most-likely-already-used link. Bounce to sign-in with a reason.
  if (!code) {
    const back = new URL("/sign-in", req.url);
    back.searchParams.set("next", next);
    back.searchParams.set("auth_error", "link");
    return NextResponse.redirect(back);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) return NextResponse.redirect(new URL(next, req.url)); // not configured

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    const back = new URL("/sign-in", req.url);
    back.searchParams.set("next", next);
    back.searchParams.set("auth_error", "exchange");
    return NextResponse.redirect(back);
  }

  return NextResponse.redirect(new URL(next, req.url));
}
