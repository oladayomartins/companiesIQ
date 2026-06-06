"use client";
import Link from "next/link";
import { useState } from "react";
import { Button, Input, Badge } from "@/components/ds";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

export function SignIn() {
  const configured = isSupabaseConfigured();
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
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-sub">Read the register. Free to search — no card required.</p>

        {!configured ? (
          <div className="auth-note">
            <Badge tone="warn">Demo mode</Badge>
            <p>
              Supabase isn&apos;t configured, so sign-in is disabled. You can still explore the full product with the
              live register and sample data.
            </p>
            <Link href="/app">
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
            <p>We sent a magic link to {email}. Open it on this device to sign in.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-form">
            <Input label="Work email" type="email" placeholder="you@company.co.uk" value={email} onChange={(e) => setEmail(e.target.value)} required iconLeft="users" />
            {error ? <span className="ciq-field__hint ciq-field__hint--error">{error}</span> : null}
            <Button variant="primary" block type="submit" disabled={busy} iconRight="arrowRight">
              {busy ? "Sending…" : "Email me a magic link"}
            </Button>
          </form>
        )}

        <p className="auth-foot">
          New to CompaniesIQ? <Link href="/pricing">See plans</Link> · <Link href="/app">Browse free</Link>
        </p>
      </div>
    </main>
  );
}
