"use client";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Input, Badge } from "@/components/ds";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

export function SignIn() {
  const configured = isSupabaseConfigured();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    setBusy(true);
    setError(null);
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // Carry the intended destination through the magic link so the callback
      // returns the user to the page they were trying to reach.
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="auth-wrap">
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
          One email field — no password. We&apos;ll send you a secure magic link. New to CompaniesIQ? Your account is
          created automatically the first time.
        </p>

        {!configured ? (
          <div className="auth-note">
            <Badge tone="warn">Demo mode</Badge>
            <p>
              Supabase isn&apos;t configured, so sign-in is disabled. You can still explore the full product with the
              live register and sample data.
            </p>
            <Link href={next}>
              <Button variant="primary" block iconRight="arrowRight">
                Enter the app
              </Button>
            </Link>
          </div>
        ) : sent ? (
          <div className="auth-note">
            <Badge tone="pos" dot>
              Check your inbox
            </Badge>
            <p>
              We&apos;ve emailed a one-click magic link to <strong>{email}</strong>. Open it on this device to continue —
              it signs you in (or creates your account) instantly. No password needed.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-form">
            <Input label="Email address" type="email" placeholder="you@company.co.uk" value={email} onChange={(e) => setEmail(e.target.value)} required iconLeft="users" />
            {error ? <span className="ciq-field__hint ciq-field__hint--error">{error}</span> : null}
            <Button variant="primary" block type="submit" disabled={busy} iconRight="arrowRight">
              {busy ? "Sending…" : "Email me a magic link"}
            </Button>
            <p className="auth-hint">Passwordless · the same link signs you in and signs you up.</p>
          </form>
        )}

        <p className="auth-foot">
          Free to search · no card required · <Link href="/pricing">see plans</Link>
        </p>
      </div>
    </main>
  );
}
