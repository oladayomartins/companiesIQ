"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Badge, Input, Icon } from "@/components/ds";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { fmtDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { BillingSummary } from "@/lib/billing";

const PLAN_LABEL: Record<string, string> = { free: "Free", analyst: "Analyst", team: "Team", enterprise: "Enterprise" };

export function SettingsScreen({ email, fullName, billing, comped = false }: { email: string; fullName: string; billing: BillingSummary; comped?: boolean }) {
  const router = useRouter();
  const subscribed = billing.plan !== "free";
  // Comped = admin/partner (e.g. DigitWarehouse) with full Pro access but no
  // paid Stripe subscription. Show their access state, not an upgrade nudge.
  const compedOnly = comped && !subscribed;

  // Profile
  const [name, setName] = useState(fullName);
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  async function saveName() {
    setSavingName(true);
    setNameSaved(false);
    try {
      const r = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ full_name: name }),
      });
      if (r.ok) {
        setNameSaved(true);
        toast("Profile saved");
      } else {
        toast("Couldn't save profile", { tone: "error" });
      }
    } finally {
      setSavingName(false);
    }
  }

  // Billing / account actions
  const [busy, setBusy] = useState<null | "portal" | "out">(null);
  async function portal() {
    setBusy("portal");
    try {
      const r = await fetch("/api/portal", { method: "POST" });
      const d = (await r.json().catch(() => ({}))) as { url?: string };
      if (d.url) {
        window.location.href = d.url;
        return;
      }
    } catch {
      /* ignore */
    }
    setBusy(null);
  }
  async function signOut() {
    setBusy("out");
    const sb = getSupabaseBrowser();
    if (sb) await sb.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Account</div>
          <h1 className="screen-title">Settings</h1>
        </div>
      </div>

      {/* Profile */}
      <section className="set-section">
        <div className="set-section__head">
          <h2 className="set-section__title">Profile</h2>
          <p className="set-section__sub">Your account details.</p>
        </div>
        <div className="set-section__body">
          <div className="set-field">
            <label className="set-field__label">Email</label>
            <div className="set-field__static">
              <span className="mono">{email}</span>
              <span className="set-field__hint">Sign-in email · magic-link only</span>
            </div>
          </div>
          <Input label="Display name" value={name} onChange={(e) => { setName(e.target.value); setNameSaved(false); }} placeholder="Your name" />
          <div className="set-actions">
            <Button variant="secondary" onClick={saveName} disabled={savingName}>
              {savingName ? "Saving…" : "Save profile"}
            </Button>
            {nameSaved ? <span className="set-saved"><Icon name="check" size={14} color="var(--pos)" /> Saved</span> : null}
          </div>
        </div>
      </section>

      {/* Billing */}
      <section className="set-section">
        <div className="set-section__head">
          <h2 className="set-section__title">Billing &amp; plan</h2>
          <p className="set-section__sub">Manage your subscription and view billing history.</p>
        </div>
        <div className="set-section__body">
          <div className="set-billing__row">
            <div>
              <div className="set-field__label">Current plan</div>
              <div className="set-billing__plan">
                <Badge tone={subscribed || compedOnly ? "accent" : "neutral"} dot>
                  {compedOnly ? "Full access" : PLAN_LABEL[billing.plan] ?? billing.plan}
                </Badge>
                {subscribed ? (
                  <span className="set-field__hint">{billing.status}</span>
                ) : compedOnly ? (
                  <span className="set-field__hint">Complimentary — partner / admin account</span>
                ) : (
                  <span className="set-field__hint">No active subscription</span>
                )}
              </div>
              {subscribed && billing.currentPeriodEnd ? (
                <div className="set-field__hint" style={{ marginTop: 6 }}>
                  Renews {fmtDate(billing.currentPeriodEnd)}
                </div>
              ) : null}
            </div>
            <div className="set-actions">
              {subscribed ? (
                <Button variant="secondary" onClick={portal} disabled={!!busy}>
                  {busy === "portal" ? "Opening…" : "Manage billing"}
                </Button>
              ) : compedOnly ? null : (
                <Link href="/app/upgrade">
                  <Button variant="primary" iconRight="arrowRight">
                    Upgrade to Pro
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Billing history */}
          <div className="set-history">
            <div className="set-field__label">Billing history</div>
            {billing.invoices.length ? (
              <div className="set-invoices">
                {billing.invoices.map((inv, i) => (
                  <div className="set-invoice" key={i}>
                    <span className="set-invoice__date mono">{inv.date ? fmtDate(inv.date) : "—"}</span>
                    <span className="set-invoice__amt">
                      {inv.currency === "GBP" ? "£" : ""}
                      {inv.amount.toFixed(2)} {inv.currency !== "GBP" ? inv.currency : ""}
                    </span>
                    <Badge tone={inv.status === "paid" ? "pos" : "neutral"}>{inv.status}</Badge>
                    <span className="set-invoice__links">
                      {inv.url ? (
                        <a href={inv.url} target="_blank" rel="noreferrer">View</a>
                      ) : null}
                      {inv.pdf ? (
                        <a href={inv.pdf} target="_blank" rel="noreferrer">PDF</a>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="set-field__hint" style={{ marginTop: 6 }}>
                {subscribed
                  ? "No invoices yet — your first one will appear here."
                  : compedOnly
                    ? "No invoices — your access is complimentary, so there's nothing to bill."
                    : "No billing history — you're on the free plan."}
              </p>
            )}
            {subscribed ? (
              <button className="set-link" onClick={portal} disabled={!!busy}>
                Open billing portal for full history, receipts &amp; payment method →
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Account */}
      <section className="set-section">
        <div className="set-section__head">
          <h2 className="set-section__title">Account</h2>
          <p className="set-section__sub">Signed in via magic link — there&apos;s no password to manage.</p>
        </div>
        <div className="set-section__body">
          <Button variant="ghost" onClick={signOut} disabled={!!busy}>
            {busy === "out" ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </section>
    </div>
  );
}
