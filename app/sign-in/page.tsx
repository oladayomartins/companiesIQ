import { Suspense } from "react";
import Link from "next/link";
import { SignInForm } from "@/components/marketing/SignIn";

export const metadata = { title: "Sign in or sign up · CompaniesIQ" };

// The shell renders on the server. Only SignInForm suspends — it calls
// useSearchParams(), and when that boundary wrapped the whole page the
// server-rendered HTML was empty: no landmark, no heading, and a blank screen
// until hydration for anyone on a slow connection.
export default function SignInPage() {
  return (
    <main className="auth-wrap" id="main-content" tabIndex={-1}>
      <div className="auth-card">
        <Link className="site-logo" href="/" style={{ justifyContent: "center", marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/ciq-mark.svg" width={32} height={32} alt="" />
          <span className="site-logo__word">
            Companies<span className="site-logo__iq">IQ</span>
          </span>
        </Link>
        <h1 className="auth-title">Sign in or sign up</h1>
        <p className="auth-sub">
          One email field — no password. We&apos;ll email you a one-time sign-in code. New to CompaniesIQ? Your account
          is created automatically the first time.
        </p>
        <Suspense fallback={<div className="auth-form auth-form--pending" aria-hidden="true" />}>
          <SignInForm />
        </Suspense>
      </div>
    </main>
  );
}
