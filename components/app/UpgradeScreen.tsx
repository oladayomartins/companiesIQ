"use client";
import { useState } from "react";
import { Button, Badge, Icon, Switch } from "@/components/ds";
import { MARKETING_TIERS, type Plan } from "@/lib/subscription";

// In-app plan picker. Subscribes directly via Stripe (no free trial) and the
// user comes straight back into the app with Pro unlocked.
export function UpgradeScreen() {
  const [annual, setAnnual] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(t: Plan) {
    if (t.monthly === null) {
      window.location.href = "mailto:sales@companiesiq.co.uk?subject=CompaniesIQ%20Enterprise";
      return;
    }
    setBusy(t.id);
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: t.id, interval: annual ? "annual" : "monthly" }),
      });
      if (res.status === 401) {
        window.location.href = "/sign-in?next=/app/upgrade";
        return;
      }
      const d = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (d.url) {
        window.location.href = d.url;
        return;
      }
      setError(d.error || "Subscriptions aren't available yet — check back shortly.");
    } catch {
      setError("Something went wrong starting checkout.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="screen" style={{ maxWidth: 1040 }}>
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Upgrade</div>
          <h1 className="screen-title">Unlock the full platform</h1>
        </div>
        <div className="bill-toggle">
          <span className={!annual ? "is-on" : ""}>Monthly</span>
          <Switch checked={annual} onChange={(e) => setAnnual(e.target.checked)} />
          <span className={annual ? "is-on" : ""}>Annual</span>
          <Badge tone="pos">Save 20%</Badge>
        </div>
      </div>

      {error ? <div className="editor-alert editor-alert--error">{error}</div> : null}

      <div className="upgrade-tiers">
        {MARKETING_TIERS.map((t) => {
          const custom = t.monthly === null;
          return (
            <div className={"upgrade-tier" + (t.popular ? " upgrade-tier--pop" : "")} key={t.id}>
              {t.popular ? (
                <div className="upgrade-tier__flag">
                  <Badge tone="accent">Most popular</Badge>
                </div>
              ) : null}
              <div className="upgrade-tier__name">{t.name}</div>
              <div className="upgrade-tier__tag">{t.tagline}</div>
              <div className="upgrade-tier__price">
                {custom ? (
                  <span className="upgrade-tier__amt">Custom</span>
                ) : (
                  <>
                    <span className="upgrade-tier__amt">£{annual ? t.annual : t.monthly}</span>
                    <span className="upgrade-tier__per mono">/user/mo</span>
                  </>
                )}
              </div>
              <Button variant={t.popular ? "primary" : "secondary"} block onClick={() => choose(t)} disabled={busy === t.id}>
                {busy === t.id ? "One moment…" : custom ? "Contact sales" : `Subscribe to ${t.name}`}
              </Button>
              <ul className="upgrade-tier__feats">
                {t.features.map((f) => (
                  <li key={f}>
                    <Icon name="check" size={15} color="var(--accent)" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="upgrade-note mono">Billed securely via Stripe · cancel anytime · no free trial — full access immediately.</p>
    </div>
  );
}
