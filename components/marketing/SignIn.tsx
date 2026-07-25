"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Input, Badge } from "@/components/ds";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

// Passwordless sign-in via a one-time email CODE (not a magic link). A code
// can't be consumed by an email scanner / browser prefetch the way a single-use
// magic-link URL can, which is what was silently burning the token before the
// user's click (see the auth debugging in the git history). Flow:
//   1. enter email  -> signInWithOtp() emails a code
//   2. enter code   -> verifyOtp() sets the session, then we navigate to `next`
export function SignIn() {
  const configured = isSupabaseConfigured();
  const params = useSearchParams();
  const next = params.get("next") || "/app";

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // If the user arrived here from an old/expired magic link (Supabase reports it
  // in the URL hash; our callback via ?auth_error), explain it and steer them to
  // the code flow. Clean the URL so a refresh doesn't re-show the message.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("error") || hash.get("error_code") || params.get("auth_error")) {
      setNotice("That sign-in link couldn’t be used. Enter your email below and we’ll send a one-time code instead.");
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
  }, [params]);

  // Resend cooldown ticker (Supabase rate-limits new codes to ~1/min).
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!configured || busy) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    // No emailRedirectTo: we verify the code in-app rather than via a link.
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) {
      setError(error.message);
      toast("Couldn’t send the code — check the email and try again.", { tone: "error" });
      return;
    }
    setStep("code");
    setCode("");
    setCooldown(45);
    toast(`Code sent to ${email} — check your inbox`, { tone: "info" });
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!configured || busy) return;
    const token = code.replace(/\D/g, "").trim();
    if (token.length < 6) {
      setError("Enter the full code from your email.");
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      setBusy(false);
      setError("That code is incorrect or has expired. Check the most recent email, or resend a new code.");
      return;
    }
    // verifyOtp has written the session cookies. Do a full navigation (not a
    // client push) so middleware + server components pick up the new session.
    toast("Signed in — taking you in…", { tone: "info" });
    window.location.assign(next);
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
          One email field — no password. We&apos;ll email you a one-time sign-in code. New to CompaniesIQ? Your account is
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
        ) : step === "code" ? (
          <form onSubmit={verifyCode} className="auth-form">
            <div className="auth-note" role="status" style={{ marginBottom: 16 }}>
              <Badge tone="pos" dot>
                Check your inbox
              </Badge>
              <p>
                We&apos;ve emailed a sign-in code to <strong>{email}</strong>. Enter it below to sign in. The code
                expires shortly.
              </p>
            </div>
            <Input
              label="Sign-in code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={8}
              placeholder="Enter the code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              autoFocus
              required
              iconLeft="shield"
              error={error ?? undefined}
            />
            <Button variant="primary" block type="submit" disabled={busy} iconRight="arrowRight">
              {busy ? "Verifying…" : "Verify & sign in"}
            </Button>
            <div className="auth-hint" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <button
                type="button"
                className="auth-linkbtn"
                onClick={() => sendCode()}
                disabled={busy || cooldown > 0}
                style={{ background: "none", border: 0, padding: 0, cursor: cooldown > 0 ? "default" : "pointer", color: "inherit", textDecoration: "underline" }}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
              <button
                type="button"
                className="auth-linkbtn"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
                style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "inherit", textDecoration: "underline" }}
              >
                Use a different email
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={sendCode} className="auth-form">
            {notice ? (
              <div className="auth-note" role="status" style={{ marginBottom: 16 }}>
                <Badge tone="warn">Link expired</Badge>
                <p>{notice}</p>
              </div>
            ) : null}
            <Input
              label="Email address"
              type="email"
              placeholder="you@company.co.uk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              iconLeft="users"
              error={error ?? undefined}
            />
            <Button variant="primary" block type="submit" disabled={busy} iconRight="arrowRight">
              {busy ? "Sending…" : "Email me a sign-in code"}
            </Button>
            <p className="auth-hint">Passwordless · the same code signs you in and signs you up.</p>
          </form>
        )}

        <p className="auth-foot">
          Free to search · no card required · <Link href="/pricing">see plans</Link>
        </p>
      </div>
    </main>
  );
}
