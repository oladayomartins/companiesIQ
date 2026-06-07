"use client";
import { useState } from "react";
import { Icon } from "@/components/ds";
import { fmtNumber } from "@/lib/format";
import type { Partner } from "@/lib/partners";

interface CompetitorExample {
  name: string;
  website: boolean;
  gbp: boolean;
  reviewCount: number | null;
  reviewRating: number | null;
}
interface Competitors {
  total: number;
  sampleSize: number;
  pctWebsite: number | null;
  pctGbp: number | null;
  pctReviews: number | null;
  avgRating: number | null;
  avgSignals: number | null;
  examples: CompetitorExample[];
}
interface Subject {
  website: boolean;
  gbp: boolean;
  reviewCount: number | null;
  reviewRating: number | null;
  measured: boolean;
}
export interface GrowthData {
  number: string;
  name: string;
  sector: string;
  region: string;
  industry: { businesses: number; newLastYear: number; annualGrowth: number; fiveYearSurvival: number };
  local: { inSameIndustry: number; newEntrants: number; density: string };
  subject: Subject | null;
  competitors: Competitors | null;
}

const ROADMAP = [
  ["Website", "A fast, mobile-friendly site customers and search engines can read."],
  ["Google Business Profile", "The listing that puts you on the map and in the local pack."],
  ["Customer reviews", "Social proof that lifts both ranking and conversion."],
  ["Local SEO & citations", "Consistent details across directories so you rank locally."],
  ["AI visibility", "Structured data so assistants can find and recommend you."],
];

// Subject signal state — honest: "Not detected" when we couldn't confidently
// find the business at all, "Not found" when we found it but the signal is absent.
function subjStatus(present: boolean, measured: boolean): { ok: boolean; text: string } {
  if (present) return { ok: true, text: "Detected" };
  return { ok: false, text: measured ? "Not found" : "Not detected" };
}

function SignalRow({ label, present, measured }: { label: string; present: boolean; measured: boolean }) {
  const s = subjStatus(present, measured);
  return (
    <div className="gr-sig">
      <span className={"gr-sig__icon " + (s.ok ? "gr-sig__icon--ok" : "gr-sig__icon--no")}>
        <Icon name={s.ok ? "check" : "x"} size={13} />
      </span>
      <span className="gr-sig__label">{label}</span>
      <span className={"gr-sig__status " + (s.ok ? "is-ok" : "")}>{s.text}</span>
    </div>
  );
}

export function GrowthReport({
  data,
  partner,
  source,
  verified,
  purchased = false,
}: {
  data: GrowthData;
  partner: Partner;
  source: string | null;
  verified: boolean;
  purchased?: boolean;
}) {
  const c = data;
  const comp = c.competitors;
  const enough = !!comp && comp.sampleSize >= 3;
  const subj = c.subject;
  const measured = !!subj?.measured;
  const hasWeb = !!subj?.website;
  const hasGbp = !!subj?.gbp;
  const hasRev = (subj?.reviewCount ?? 0) > 0;
  const found = (hasWeb ? 1 : 0) + (hasGbp ? 1 : 0) + (hasRev ? 1 : 0);
  const behind = enough && comp!.avgSignals != null && found < comp!.avgSignals;

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  // Competitor examples unlock once the founder submits the form, verifies, or buys.
  const unlocked = verified || purchased || status === "done";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, companyNumber: c.number, companyName: c.name, source, partner: partner.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <main className="gr">
      {purchased ? (
        <div className="gr-verified">✓ Payment received — thank you! {partner.name} will be in touch to get started.</div>
      ) : verified ? (
        <div className="gr-verified">✓ Email confirmed — your full report is unlocked.</div>
      ) : null}

      {/* Hero */}
      <header className="gr-hero">
        <div className="gr-eyebrow">{partner.name} · Growth Report</div>
        <h1 className="gr-title">{c.name}</h1>
        <p className="gr-sub">
          {c.sector} · {c.region}
        </p>
      </header>

      {/* 1 · Visibility snapshot — the founder's own status, up top */}
      <section className="gr-section gr-section--accent">
        <h2 className="gr-h2">Your visibility snapshot</h2>
        <div className="gr-snapshot">
          <div className="gr-snap">
            <div className="gr-snap__h">{c.name}</div>
            <SignalRow label="Website" present={hasWeb} measured={measured} />
            <SignalRow label="Google Business Profile" present={hasGbp} measured={measured} />
            <SignalRow label="Customer reviews" present={hasRev} measured={measured} />
            <div className="gr-snap__count">{found} of 3 visibility signals found</div>
          </div>
          {enough ? (
            <div className="gr-snap">
              <div className="gr-snap__h">Similar businesses in {c.region}</div>
              <div className="gr-sig">
                <span className="gr-sig__label">Website</span>
                <span className="gr-sig__pct">{comp!.pctWebsite}%</span>
              </div>
              <div className="gr-sig">
                <span className="gr-sig__label">Google Business Profile</span>
                <span className="gr-sig__pct">{comp!.pctGbp}%</span>
              </div>
              <div className="gr-sig">
                <span className="gr-sig__label">Customer reviews</span>
                <span className="gr-sig__pct">{comp!.pctReviews}%</span>
              </div>
              <div className="gr-snap__count">{comp!.avgSignals} of 3 on average</div>
            </div>
          ) : null}
        </div>
        <p className="gr-verdict">
          {enough
            ? behind
              ? `We couldn't find an established online presence for ${c.name}, while similar businesses in ${c.region} average ${comp!.avgSignals} of 3 visibility signals. Customers searching locally may find them before they find you.`
              : `${c.name} is keeping pace with similar businesses in ${c.region} on the signals we can measure.`
            : `Here's how discoverable ${c.name} looks online today, and the steps to improve it.`}
        </p>
      </section>

      {/* 2 · How competitors compare + real examples */}
      {enough ? (
        <section className="gr-section">
          <h2 className="gr-h2">Businesses like yours are already visible</h2>
          <div className="gr-bars">
            <Bar label="Have a website" pct={comp!.pctWebsite} />
            <Bar label="Have a Google Business Profile" pct={comp!.pctGbp} />
            <Bar label="Have customer reviews" pct={comp!.pctReviews} />
          </div>
          {comp!.examples.length ? (
            <>
              <h3 className="gr-h3">Visible businesses in your area</h3>
              {unlocked ? (
                <div className="gr-examples">
                  {comp!.examples.map((e, i) => (
                    <div className="gr-ex" key={i}>
                      <div className="gr-ex__name">{e.name}</div>
                      <div className="gr-ex__signals">
                        {e.website ? <span className="gr-chip">✓ Website</span> : null}
                        {e.gbp ? <span className="gr-chip">✓ Profile</span> : null}
                        {(e.reviewCount ?? 0) > 0 ? (
                          <span className="gr-chip">✓ {fmtNumber(e.reviewCount!)} reviews{e.reviewRating ? ` · ${e.reviewRating}★` : ""}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gr-locked">
                  <div className="gr-locked__blur" aria-hidden>
                    {comp!.examples.map((_, i) => (
                      <div className="gr-ex" key={i}>
                        <div className="gr-ex__name">●●●●●● Ltd</div>
                        <div className="gr-ex__signals">
                          <span className="gr-chip">✓ Website</span>
                          <span className="gr-chip">✓ Profile</span>
                          <span className="gr-chip">✓ ●● reviews</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <a className="gr-locked__cta" href="#report">
                    🔒 See the {comp!.examples.length} businesses ahead of you — unlock below
                  </a>
                </div>
              )}
            </>
          ) : null}
          <p className="gr-source">Measured across {comp!.sampleSize} similar {c.region} businesses · Google Places</p>
          {behind ? (
            <div className="gr-callout">
              <strong>What this means.</strong> Customers searching for a business like yours are more likely to discover
              these competitors first. Most have already established their presence through a Google Business Profile, a
              website and reviews.
            </div>
          ) : null}
        </section>
      ) : (
        <section className="gr-section">
          <h2 className="gr-h2">How you compare locally</h2>
          <p className="gr-muted">
            We&apos;re still measuring the online presence of businesses in your area. Request your report below and
            we&apos;ll include the full competitor breakdown when it&apos;s ready — we never show estimated figures.
          </p>
        </section>
      )}

      {/* 3 · Biggest opportunity */}
      <section className="gr-section">
        <h2 className="gr-h2">Your biggest opportunity</h2>
        <p className="gr-body" style={{ marginBottom: 14 }}>The fastest ways to become more discoverable:</p>
        <ol className="gr-steps">
          <li>Create a Google Business Profile so you appear on the map and in the local pack.</li>
          <li>Launch a professional website customers and search engines can read.</li>
          <li>Start collecting customer reviews to build trust and ranking.</li>
        </ol>
      </section>

      {/* 4 · Growth roadmap (checklist) */}
      <section className="gr-section">
        <h2 className="gr-h2">Your growth roadmap</h2>
        <div className="gr-roadmap">
          {ROADMAP.map(([title, desc]) => (
            <div className="gr-task" key={title}>
              <span className="gr-task__box">
                <Icon name="check" size={13} />
              </span>
              <div className="gr-task__main">
                <div className="gr-task__t">{title}</div>
                <div className="gr-task__d">{desc}</div>
              </div>
              <span className="gr-task__status">Not started</span>
            </div>
          ))}
        </div>
      </section>

      {/* 5 · Unlock full report — lead capture BEFORE pricing */}
      <section className="gr-section gr-section--cta" id="report">
        <h2 className="gr-h2">Unlock your full report</h2>
        {status === "done" ? (
          <div className="gr-done">
            <p>
              <strong>Check your inbox.</strong> We&apos;ve emailed {form.email || "you"} a link to confirm and open your
              full report.
            </p>
            <button className="gr-btn gr-btn--ghost" onClick={() => window.print()}>
              Print / save as PDF
            </button>
          </div>
        ) : (
          <>
            <p className="gr-body" style={{ marginBottom: 14 }}>
              Get the full breakdown — your signals, the competitor comparison and your roadmap — emailed to you.
            </p>
            <form className="gr-form" onSubmit={submit}>
              <div className="gr-form__row">
                <input required placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                <input required placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <input required type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input type="tel" placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              {error ? <div className="gr-err">{error}</div> : null}
              <button className="gr-btn" type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Email me the full report"}
              </button>
              <p className="gr-fineprint">We&apos;ll email you a confirmation link. No spam.</p>
            </form>
          </>
        )}
      </section>

      {/* 6 · Offer */}
      <section className="gr-section">
        <h2 className="gr-h2">Get this exclusive offer to level up</h2>
        <p className="gr-body" style={{ marginBottom: 18 }}>
          {found < 3
            ? `You're missing ${3 - found} of 3 key visibility signals. ${partner.name} can close the gaps — pick a package, or book a free review.`
            : `${partner.name} can take your visibility further — pick a package, or book a free review.`}
        </p>
        <div className="gr-packages">
          {partner.packages.map((p) => (
            <div key={p.name} className={"gr-pkg" + (p.recommended ? " gr-pkg--rec" : "")}>
              {p.recommended ? <div className="gr-pkg__badge">Recommended</div> : null}
              <div className="gr-pkg__name">{p.name}</div>
              <div className="gr-pkg__price">{p.price}</div>
              {p.tagline ? <div className="gr-pkg__tag">{p.tagline}</div> : null}
              <ul className="gr-pkg__features">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {p.stripePriceId ? (
                <a
                  className={"gr-pkg__btn" + (p.recommended ? " gr-pkg__btn--rec" : "")}
                  href={`/api/checkout?price=${p.stripePriceId}&company=${encodeURIComponent(c.number)}&source=${encodeURIComponent(source ?? partner.id)}`}
                >
                  Choose {p.name}
                </a>
              ) : null}
            </div>
          ))}
        </div>
        <div className="gr-offer-cta">
          <a className="gr-btn gr-btn--lg" href={partner.bookingUrl} target="_blank" rel="noopener noreferrer">
            {partner.bookingLabel}
          </a>
        </div>
      </section>

      <footer className="gr-foot">
        Market data from Companies House, ONS &amp; Nomis. Web-presence signals measured via Google Places. Educational —
        not financial advice. Brought to you by {partner.name}, powered by CompaniesIQ.
      </footer>
    </main>
  );
}

function Bar({ label, pct }: { label: string; pct: number | null }) {
  return (
    <div className="gr-bar">
      <div className="gr-bar__head">
        <span>{label}</span>
        <span className="gr-bar__pct">{pct == null ? "—" : `${pct}%`}</span>
      </div>
      <div className="gr-bar__track">
        <span style={{ width: `${pct ?? 0}%` }} />
      </div>
    </div>
  );
}
