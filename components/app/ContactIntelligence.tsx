"use client";
import { useState } from "react";
import { Badge, Button } from "@/components/ds";
import type { DigitalFact } from "@/lib/opportunity";
import { confidenceReason, type CompanyContacts, type ContactPoint, type ConfidenceLevel } from "@/lib/enrichment/contact-types";

// ============================================================
// Digital presence & contact — one block, three levels of disclosure
// ------------------------------------------------------------
// This replaces the static "Digital presence" block that used to sit here and
// print four rows of "Not checked" with no way to check anything. It is the
// same four rows, plus the one thing they were missing: a button.
//
// It is a BLOCK inside "Signals & evidence", not a card of its own. The report
// already had digital presence stated twice; a third statement of it in a new
// card would have made a long page longer.
//
// Disclosure order is deliberate:
//   1. the answer      — hello@abcdigital.co.uk, High confidence
//   2. the provenance  — which page, which date, on the same line
//   3. the working     — the full check list, behind "Show evidence"
//
// A reader who just wants the email should never have to read a verification
// report to get it. The evidence is what makes the value defensible when
// somebody challenges it — a second-order need, so it lives one click down.
// ============================================================

const TONE: Record<ConfidenceLevel, "pos" | "warn" | "neutral"> = { high: "pos", medium: "warn", low: "neutral" };

// One measured fact — a confident, sourced statement. Detected → the value (a
// link where it is one); not detected → an explicit "Not detected"; not
// assessed → "Not assessed" (we never guess).
function FactRow({ fact }: { fact: DigitalFact }) {
  const tone = fact.state === "detected" ? "pos" : fact.state === "not_detected" ? "warn" : "neutral";
  const text =
    fact.state === "detected"
      ? fact.value ?? "Detected"
      : fact.state === "not_detected"
        ? fact.value ?? "Not detected"
        : "Not assessed";
  return (
    <div className="readiness__row">
      <span className="readiness__label">{fact.label}</span>
      {fact.state === "detected" && fact.href ? (
        <a className="link-btn" href={fact.href} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      ) : (
        <Badge tone={tone}>{text}</Badge>
      )}
    </div>
  );
}

/** A found email or phone: the value, its confidence, and its working on demand. */
function ContactRow({ point }: { point: ContactPoint }) {
  const [open, setOpen] = useState(false);
  const href = point.kind === "email" ? `mailto:${point.value}` : `tel:${point.value}`;
  const page = point.foundOn.find((p) => p.startsWith("http"));

  return (
    <div className="cpoint">
      <div className="readiness__row">
        <a className="cpoint__value" href={href}>
          {point.display}
        </a>
        <span className="cpoint__meta">
          {point.kind === "email" && point.role !== "general" ? <Badge tone="neutral">{point.role}</Badge> : null}
          <Badge tone={TONE[point.confidence]} dot>
            {point.confidence}
          </Badge>
          <button className="cpoint__toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? "Hide evidence" : "Show evidence"}
          </button>
        </span>
      </div>
      {open ? (
        <div className="cpoint__checks">
          {point.checks.map((c) => (
            <div key={c.id} className={`opp-row opp-row--${c.passed === true ? "good" : c.passed === false ? "watch" : "neutral"}`}>
              <span className="opp-row__mark" aria-hidden="true">
                {c.passed === true ? "✓" : c.passed === false ? "✗" : "⚠"}
              </span>
              <span>{c.passed === null ? `${c.label} — not checked` : c.label}</span>
            </div>
          ))}
          <p className="cpoint__foot mono">
            {confidenceReason(point)}
            {page ? (
              <>
                {" · "}
                <a href={page} target="_blank" rel="noopener noreferrer nofollow">
                  source page
                </a>
              </>
            ) : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function ContactIntelligence({
  number,
  companyName,
  digital,
  measured,
  entitled,
  remaining,
  upgradeHref = "/pricing",
}: {
  number: string;
  companyName: string;
  /** The Places-measured facts already on the report — the pre-run state. */
  digital: { website: DigitalFact; gbp: DigitalFact; reviews: DigitalFact; phone: DigitalFact };
  measured: boolean;
  /** False for readers whose plan doesn't include discovery — the block sells. */
  entitled: boolean;
  /** Lookups left this month; -1 for unlimited, null when not applicable. */
  remaining: number | null;
  upgradeHref?: string;
}) {
  const [contacts, setContacts] = useState<CompanyContacts | null>(null);
  const [left, setLeft] = useState(remaining);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${encodeURIComponent(number)}`, { method: "POST" });
      const body = (await res.json()) as { contacts?: CompanyContacts; allowance?: { remaining: number }; error?: string };
      if (!res.ok || !body.contacts) {
        setError(body.error ?? "Contact discovery failed. Try again shortly.");
        return;
      }
      setContacts(body.contacts);
      if (body.allowance) setLeft(body.allowance.remaining);
    } catch {
      setError("Contact discovery failed. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  const site = contacts?.website ?? null;
  const found = contacts ? [...contacts.emails, ...contacts.phones] : [];
  const allowanceLabel = left == null || left < 0 ? null : `${left} left this month`;

  // Once discovery has run it knows more than Places did, so the summary rows
  // have to reflect that. Leaving "Website — Not assessed" above a verified
  // website is the same contradiction this whole section exists to avoid; the
  // rows Places alone can answer (GBP, reviews) are left exactly as they were.
  const topPhone = contacts?.phones[0] ?? null;
  const rows = {
    website: site
      ? ({ label: "Website", state: "detected", value: site.host, href: site.url } as DigitalFact)
      : contacts
        ? ({ label: "Website", state: "not_detected", value: "None verified" } as DigitalFact)
        : digital.website,
    gbp: digital.gbp,
    reviews: digital.reviews,
    phone: topPhone
      ? ({ label: "Phone", state: "detected", value: topPhone.display, href: `tel:${topPhone.value}` } as DigitalFact)
      : digital.phone,
  };

  return (
    <div className="opp-block">
      <div className="opp-block__title">
        Digital presence &amp; contact
        <Badge tone={contacts ? "pos" : measured ? "pos" : "neutral"}>
          {contacts ? "Verified" : measured ? "Measured" : "Not assessed"}
        </Badge>
      </div>

      <div className="readiness">
        <FactRow fact={rows.website} />
        <FactRow fact={rows.gbp} />
        <FactRow fact={rows.reviews} />
        <FactRow fact={rows.phone} />
      </div>

      {/* What the four rows above were always missing: a way to find out. */}
      {contacts ? (
        <div className="cblock">
          {site ? (
            <p className="rsec__note">
              Website verified via {site.discoveredVia === "google-places" ? "its Google Business Profile" : "its registered name"}
              {" — "}
              {site.confidence} confidence, {site.checks.filter((c) => c.passed === true).length} of{" "}
              {site.checks.filter((c) => c.passed !== null).length} checks passed.
            </p>
          ) : null}

          {found.length ? (
            <div className="readiness readiness--single">
              {found.map((p) => (
                <ContactRow key={p.value} point={p} />
              ))}
            </div>
          ) : (
            <p className="rsec__note">
              {contacts.status === "no_website"
                ? "No website could be verified as this company's, so no contact details are claimed. Better nothing than somebody else's details."
                : contacts.status === "blocked"
                  ? "This site asks crawlers not to read its pages, and we respect that."
                  : "The website was read, but publishes no contact email or phone on the pages we checked."}
            </p>
          )}

          {contacts.notes.map((n, i) => (
            <p className="rsec__note" key={i}>
              {n}
            </p>
          ))}
          <Source pages={contacts.pagesCrawled.length} checkedAt={contacts.checkedAt} />
        </div>
      ) : entitled ? (
        <div className="cblock">
          <Button onClick={run} disabled={busy} variant="primary" size="sm">
            {busy ? `Reading ${companyName}'s website…` : "Find website & contact details"}
          </Button>
          {allowanceLabel ? <span className="cblock__meta mono">{allowanceLabel}</span> : null}
          {error ? <p className="contact-error">{error}</p> : null}
        </div>
      ) : (
        <div className="cblock">
          <Button href={upgradeHref} variant="secondary" size="sm">
            Find contact details
          </Button>
          <span className="cblock__meta mono">Included from Analyst</span>
        </div>
      )}

      {!contacts && measured ? (
        <div className="source">
          <span className="source__dot">●</span> Source · Google Places · public business listing
        </div>
      ) : null}
      {!contacts && !measured ? (
        <p className="rsec__note">
          Measured from Google Places when a confident match exists; otherwise shown as Not assessed (never assumed).
        </p>
      ) : null}
    </div>
  );
}

function Source({ pages, checkedAt }: { pages: number; checkedAt: string }) {
  const when = new Date(checkedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="source">
      <span className="source__dot">●</span> Source · Published by the company on its own website
      {pages ? ` · ${pages} page${pages === 1 ? "" : "s"} read` : ""} · checked {when}
    </div>
  );
}
