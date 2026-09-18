"use client";
import { useState } from "react";
import { Button, Input } from "@/components/ds";

// The "stop showing this detail" form on /bot. Deliberately the smallest thing
// that can work: one field, no account, no reason required, no verification
// step that would turn an objection into an obstacle course. Over-suppressing
// costs us one row; under-suppressing costs someone their Art. 21 right.
export function SuppressForm() {
  const [value, setValue] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts/suppress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: [value], requestedBy: requestedBy || null, reason: "owner request" }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please email privacy@companiesiq.co.uk.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please email privacy@companiesiq.co.uk.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="prose__note">
        Done — <span className="mono">{value}</span> is suppressed and will not be shown again, including after any
        future re-read of your site. Nothing further is needed from you.
      </p>
    );
  }

  return (
    <form className="suppress-form" onSubmit={submit}>
      <Input
        id="suppress-value"
        label="Email address or phone number to remove"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="hello@example.co.uk or 020 1234 5678"
        required
      />
      <Input
        id="suppress-by"
        label="Your email, if you'd like confirmation (optional)"
        type="email"
        value={requestedBy}
        onChange={(e) => setRequestedBy(e.target.value)}
        placeholder="you@example.co.uk"
      />
      <Button type="submit" disabled={busy || !value.trim()} variant="primary">
        {busy ? "Submitting…" : "Remove this detail"}
      </Button>
      {error ? <p className="contact-error">{error}</p> : null}
    </form>
  );
}
