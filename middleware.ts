import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Refreshes the Supabase auth session on every request (so server components
// and getCurrentUser() see a live session) and gates the SaaS app behind login.
//
// Public surface (never gated): marketing pages, the public company reports
// (/company/[number]), the private founder funnel (/visibility-review/*, which
// is noindex but intentionally open to cold QR traffic), /sign-in and the auth
// callback. Everything under /app is the paid intelligence workspace and
// requires a session.
//
// When Supabase isn't configured (local dev without keys) this is a no-op, so
// the app stays fully browsable during development.
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  // Auth-code rescue: if Supabase verified a magic link / email confirmation and
  // redirected back to a non-callback route (e.g. the Site URL root, "/?code=…"),
  // forward the code to /auth/callback so the session exchange actually happens.
  // The PKCE code_verifier cookie lives on this host, so exchanging here works.
  const code = req.nextUrl.searchParams.get("code");
  if (code && req.nextUrl.pathname !== "/auth/callback") {
    const cb = req.nextUrl.clone();
    cb.pathname = "/auth/callback";
    if (!cb.searchParams.get("next")) cb.searchParams.set("next", "/app");
    return NextResponse.redirect(cb);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return res; // not configured → don't gate anything

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  // IMPORTANT: getUser() (not getSession()) so the token is validated and the
  // cookie is refreshed via the setAll callback above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && req.nextUrl.pathname.startsWith("/app")) {
    const signIn = req.nextUrl.clone();
    signIn.pathname = "/sign-in";
    signIn.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }

  return res;
}

export const config = {
  // Run on everything except Next internals and static assets. This keeps the
  // session fresh on public pages too (so the report can show its unlocked
  // state) without paying the cost on asset requests.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)"],
};
