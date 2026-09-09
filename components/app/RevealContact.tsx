"use client";
import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardBody, Button, Badge, Icon } from "@/components/ds";
import type { DirectorContact, MatchConfidence } from "@/lib/enrichment/types";

function confTone(c: MatchConfidence | null): "pos" | "warn" | "neutral" {
  return c === "high" ? "pos" : c === "low" ? "warn" : "neutral";
}

// Director contact reveal. Third-party enriched data (NOT the register), Team+
// gated. `canReveal` is computed server-side (canUseContactData); this only
// renders when a provider is configured, so it's dark until you wire one up.
export function RevealContact({ officerId, canReveal }: { officerId: string; canReveal: boolean }) {
  const [contact, setContact] = useState<DirectorContact | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/directors/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ officerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn’t reveal contact.");
        return;
      }
      setContact(data.contact as DirectorContact);
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!canReveal) {
    return (
      <Card className="reveal-contact">
        <CardHeader title="Contact details" />
        <CardBody>
          <div className="reveal-contact__locked">
            <span className="reveal-contact__lockicon">
              <Icon name="shield" size={20} />
            </span>
            <p>
              Verified email and direct-dial for this director are a <strong>Team</strong> feature. Reveal contacts,
              enriched from a third-party provider and cached for your team.
            </p>
            <Link href="/app/upgrade">
              <Button variant="primary" iconRight="arrowRight">
                See plans
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  const has = contact && (contact.email || contact.phone);

  return (
    <Card className="reveal-contact">
      <CardHeader title="Contact details" subtitle="Enriched · not from Companies House" />
      <CardBody>
        {!contact ? (
          <div className="reveal-contact__cta">
            <p>Look up a verified business email and direct dial for this director.</p>
            <Button variant="primary" onClick={reveal} disabled={busy} iconRight="search">
              {busy ? "Looking up…" : "Reveal contact details"}
            </Button>
            {error ? <p className="ciq-field__hint ciq-field__hint--error">{error}</p> : null}
          </div>
        ) : has ? (
          <div className="reveal-contact__result">
            {contact.email ? (
              <div className="reveal-contact__row">
                <span className="reveal-contact__label">Email</span>
                <a href={`mailto:${contact.email}`} className="reveal-contact__value">
                  {contact.email}
                </a>
                <Badge tone={confTone(contact.emailConfidence)}>{contact.emailConfidence ?? "unverified"}</Badge>
              </div>
            ) : null}
            {contact.phone ? (
              <div className="reveal-contact__row">
                <span className="reveal-contact__label">Phone</span>
                <a href={`tel:${contact.phone}`} className="reveal-contact__value">
                  {contact.phone}
                </a>
                <Badge tone={confTone(contact.phoneConfidence)}>{contact.phoneConfidence ?? "unverified"}</Badge>
              </div>
            ) : null}
            {contact.phone ? (
              <p className="reveal-contact__note">
                <Icon name="alert" size={13} /> Screen this number against the TPS/CTPS before making a marketing call
                (PECR).
              </p>
            ) : null}
            <p className="reveal-contact__prov mono">
              {contact.source}
              {contact.provider ? ` · ${contact.provider}` : ""}
              {contact.checkedAt ? ` · ${new Date(contact.checkedAt).toLocaleDateString("en-GB")}` : ""}
              {contact.cached ? " · cached" : ""}
            </p>
          </div>
        ) : (
          <div className="reveal-contact__cta">
            <p className="reveal-contact__note">
              No verified contact found for this director yet — the provider returned nothing to assess. This is recorded
              as “Not Assessed”, never guessed.
            </p>
            <Button variant="secondary" onClick={reveal} disabled={busy}>
              {busy ? "Retrying…" : "Try again"}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
