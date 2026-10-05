"use client";
import { useState } from "react";
import { Card, CardHeader, CardBody, Button, Icon } from "@/components/ds";
import { ContactRow } from "@/components/app/ContactIntelligence";
import type { DirectorContacts } from "@/lib/enrichment/contact-types";

// ============================================================
// Director contact details — third-party enrichment
// ------------------------------------------------------------
// The director-page counterpart of ContactIntelligence, built from the same
// parts (ContactRow, cblock/cpoint styles) so the two read as one feature:
// the value first, its confidence beside it, the checks one click down.
// Rendered only when a provider is configured and the officer is a person.
// ============================================================

export function DirectorContactCard({
  officerId,
  name,
  entitled,
  remaining,
  upgradeHref = "/app/upgrade",
}: {
  officerId: string;
  name: string;
  /** False when the plan doesn't include director lookups — the card sells. */
  entitled: boolean;
  /** Lookups left this month; -1 for unlimited, null when not applicable. */
  remaining: number | null;
  upgradeHref?: string;
}) {
  const [contacts, setContacts] = useState<DirectorContacts | null>(null);
  const [left, setLeft] = useState(remaining);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/director/${encodeURIComponent(officerId)}`, { method: "POST" });
      const body = (await res.json()) as { contacts?: DirectorContacts; allowance?: { remaining: number }; error?: string };
      if (!res.ok || !body.contacts) {
        setError(body.error ?? "Couldn't look up contact details. Try again shortly.");
        return;
      }
      setContacts(body.contacts);
      if (body.allowance) setLeft(body.allowance.remaining);
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  const found = contacts ? [...contacts.emails, ...contacts.phones] : [];
  const allowanceLabel = left == null || left < 0 ? null : `${left} left this month`;

  return (
    <Card>
      <CardHeader title="Contact details" subtitle="Third-party enrichment · not from Companies House" />
      <CardBody>
        {contacts ? (
          <div className="cblock">
            {found.length ? (
              <div className="readiness readiness--single">
                {found.map((p) => (
                  <ContactRow key={p.value} point={p} />
                ))}
              </div>
            ) : (
              <p className="rsec__note">
                The provider returned nothing it could match to {name}. Recorded as not found — never guessed.
              </p>
            )}
            {contacts.phones.length ? (
              <p className="rsec__note">
                <Icon name="alert" size={13} /> Screen numbers against the TPS/CTPS before a marketing call (PECR). We
                don't screen on your behalf.
              </p>
            ) : null}
            {contacts.notes.map((n, i) => (
              <p className="rsec__note" key={i}>
                {n}
              </p>
            ))}
            <div className="source">
              <span className="source__dot">●</span> Source · Third-party contact enrichment
              {contacts.provider ? ` (${contacts.provider})` : ""}
              {contacts.checkedAt
                ? ` · checked ${new Date(contacts.checkedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                : ""}
              {contacts.cached ? " · cached" : ""}
            </div>
          </div>
        ) : entitled ? (
          <div className="cblock">
            <Button onClick={run} disabled={busy} variant="primary" size="sm">
              {busy ? "Looking up…" : "Find email & direct dial"}
            </Button>
            {allowanceLabel ? <span className="cblock__meta mono">{allowanceLabel}</span> : null}
            {error ? <p className="contact-error">{error}</p> : null}
          </div>
        ) : (
          <div className="cblock">
            <Button href={upgradeHref} variant="secondary" size="sm">
              Find email &amp; direct dial
            </Button>
            <span className="cblock__meta mono">Included from Team</span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
