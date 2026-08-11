"use client";
import { useState } from "react";
import { Button, Input, Badge } from "@/components/ds";
import { ALERT_SECTORS, ALERT_REGIONS } from "@/lib/alert-options";
import { track } from "@/lib/track";

// Free-alert opt-in. `compact` = inline email + button (for the company-page
// CTA, sector prefilled from context). Full = adds sector/region pickers and an
// optional name field (for the standalone /free-alerts page). Name/company are
// optional — the server derives a fallback from the email if omitted.
export function FreeAlertForm({
  sector = "",
  region = "",
  source = "free-alerts",
  compact = false,
  dark = false,
}: {
  sector?: string;
  region?: string;
  source?: string;
  compact?: boolean;
  dark?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [sec, setSec] = useState(sector);
  const [reg, setReg] = useState(region);
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/free-alerts/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, firstName, sector: sec, region: reg, source, website }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        setError(d.error || "Couldn’t subscribe — try again.");
        return;
      }
      track("generate_lead", { source, sector: sec || "any", region: reg || "any" });
      setDone(true);
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={`fa-done${dark ? " fa-done--dark" : ""}`} role="status">
        <Badge tone="pos" dot>
          Check your inbox
        </Badge>
        <p>You’re subscribed. Your first weekly digest of new companies is on its way — no card, unsubscribe any time.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`fa-form${compact ? " fa-form--compact" : ""}`}>
      {/* honeypot — visually hidden, ignored by humans */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      {!compact ? (
        <div className="fa-row">
          <label className="fa-field">
            <span className="fa-label">Sector</span>
            <select className="fa-select" value={sec} onChange={(e) => setSec(e.target.value)}>
              {ALERT_SECTORS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="fa-field">
            <span className="fa-label">Location</span>
            <select className="fa-select" value={reg} onChange={(e) => setReg(e.target.value)}>
              {ALERT_REGIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div className="fa-row">
        {!compact ? (
          <Input label="First name (optional)" placeholder="Jane" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        ) : null}
        <Input
          label={compact ? undefined : "Work email"}
          type="email"
          placeholder="you@company.co.uk"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          iconLeft="users"
        />
        <Button variant="primary" type="submit" disabled={busy} iconRight="arrowRight">
          {busy ? "…" : compact ? "Get free alerts" : "Get my free alerts"}
        </Button>
      </div>
      {error ? <p className="ciq-field__hint ciq-field__hint--error">{error}</p> : null}
      {!compact ? <p className="fa-fine">Free · no account · unsubscribe any time.</p> : null}
    </form>
  );
}
