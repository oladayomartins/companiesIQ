"use client";
import { useState } from "react";
import { fmtNumber, fmtDelta } from "@/lib/format";
import type { Partner } from "@/lib/partners";

// Plain, serializable props from the server page. All market figures are
// CompaniesIQ data (CH/ONS/Nomis); presence figures are measured via Places.
interface Competitors {
  total: number;
  sampleSize: number;
  pctWebsite: number | null;
  pctGbp: number | null;
  pctReviews: number | null;
  avgRating: number | null;
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
  ["Local citations", "Consistent name, address and phone across directories."],
  ["Reviews", "Social proof that lifts both ranking and conversion."],
  ["Service pages", "Pages that match what people actually search for."],
  ["AI visibility", "Structured data so assistants can find and recommend you."],
];

function pctText(n: number | null): string {
  return n == null ? "—" : `${n}%`;
}

export function GrowthReport({
  data,
  partner,
  source,
  verified,
}: {
  data: GrowthData;
  partner: Partner;
  source: string | null;
  verified: boolean;
}) {
  const c = data;
  const comp = c.competitors;
  const enough = !!comp && comp.sampleSize >= 3;

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

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

  const subjectVal = (has: boolean, measured: boolean) => (!measured ? "Not assessed" : has ? "Yes" : "No");

  return (
    <main className="gr">
      {verified ? <div className="gr-verified">✓ Email confirmed — your full report is unlocked.</div> : null}

      {/* 1 · Welcome */}
      <header className="gr-hero">
        <div className="gr-eyebrow">{partner.name} · Growth Report</div>
        <h1 className="gr-title">{c.name}</h1>
        <p className="gr-sub">
          {c.sector} · {c.region}
        </p>
        <p className="gr-lead">A snapshot of how your business shows up online — and how you compare in {c.region}.</p>
      </header>

      {/* 2 · Local Competition Snapshot (the hook) */}
      <section className="gr-section">
        <h2 className="gr-h2">Your local market</h2>
        <div className="gr-stats">
          <div className="gr-stat">
            <div className="gr-stat__n">{fmtNumber(c.local.inSameIndustry)}</div>
            <div className="gr-stat__l">Similar businesses in {c.region}</div>
          </div>
          <div className="gr-stat">
            <div className="gr-stat__n">{fmtNumber(c.local.newEntrants)}</div>
            <div className="gr-stat__l">New entrants (last 12 months)</div>
          </div>
          <div className="gr-stat">
            <div className="gr-stat__n">{fmtDelta(c.industry.annualGrowth)}</div>
            <div className="gr-stat__l">Industry growth / year</div>
          </div>
          <div className="gr-stat">
            <div className="gr-stat__n">{c.local.density}</div>
            <div className="gr-stat__l">Market density</div>
          </div>
        </div>
        <p className="gr-source">Source · Companies House &amp; ONS</p>
      </section>

      {/* 3 · What competitors are doing */}
      <section className="gr-section gr-section--accent">
        <h2 className="gr-h2">What your competitors are doing</h2>
        {enough ? (
          <>
            <div className="gr-bars">
              <Bar label="Have a website" pct={comp!.pctWebsite} />
              <Bar label="Have a Google Business Profile" pct={comp!.pctGbp} />
              <Bar label="Have customer reviews" pct={comp!.pctReviews} />
            </div>
            <p className="gr-source">
              Measured across {comp!.sampleSize} similar {c.region} businesses{comp!.avgRating ? ` · avg rating ${comp!.avgRating}★` : ""} · Google Places
            </p>
          </>
        ) : (
          <p className="gr-muted">
            We&apos;re still measuring the online presence of businesses in your area. Request your report below and
            we&apos;ll include the full competitor breakdown when it&apos;s ready — we never show estimated figures.
          </p>
        )}
      </section>

      {/* 4 · Visibility gap */}
      <section className="gr-section">
        <h2 className="gr-h2">Your visibility vs the competition</h2>
        <table className="gr-gap">
          <thead>
            <tr>
              <th>Signal</th>
              <th>Your business</th>
              <th>Competitors</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Website</td>
              <td>{c.subject ? subjectVal(c.subject.website, c.subject.measured) : "Not assessed"}</td>
              <td>{enough ? pctText(comp!.pctWebsite) : "—"}</td>
            </tr>
            <tr>
              <td>Google Business Profile</td>
              <td>{c.subject ? subjectVal(c.subject.gbp, c.subject.measured) : "Not assessed"}</td>
              <td>{enough ? pctText(comp!.pctGbp) : "—"}</td>
            </tr>
            <tr>
              <td>Reviews</td>
              <td>
                {c.subject?.measured && (c.subject.reviewCount ?? 0) > 0
                  ? `${fmtNumber(c.subject.reviewCount!)}${c.subject.reviewRating ? ` · ${c.subject.reviewRating}★` : ""}`
                  : c.subject?.measured
                    ? "None found"
                    : "Not assessed"}
              </td>
              <td>{enough ? pctText(comp!.pctReviews) : "—"}</td>
            </tr>
          </tbody>
        </table>
        <p className="gr-source">Web-presence signals measured via Google Places; &ldquo;Not assessed&rdquo; where we have no confident match.</p>
      </section>

      {/* 5 · Why this matters */}
      <section className="gr-section">
        <h2 className="gr-h2">Why this matters</h2>
        <p className="gr-body">
          Most buying journeys start with a search. When customers look for a business like yours, the ones they find
          first — on Google, in the map pack, and increasingly in AI assistants — win the enquiry. The gaps above are
          the difference between being found and being missed.
        </p>
      </section>

      {/* 6 · Growth roadmap */}
      <section className="gr-section">
        <h2 className="gr-h2">Your growth roadmap</h2>
        <ol className="gr-roadmap">
          {ROADMAP.map(([title, desc], i) => (
            <li key={title}>
              <span className="gr-roadmap__n">{i + 1}</span>
              <div>
                <div className="gr-roadmap__t">{title}</div>
                <div className="gr-roadmap__d">{desc}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 7 · Exclusive offer */}
      <section className="gr-section">
        <h2 className="gr-h2">Get this exclusive offer to level up</h2>
        <p className="gr-body" style={{ marginBottom: 18 }}>
          {partner.name} can close the gaps above — pick a package, or book a free review to talk it through.
        </p>
        <div className="gr-packages">
          {partner.packages.map((p) => (
            <div key={p.name} className={"gr-pkg" + (p.recommended ? " gr-pkg--rec" : "")}>
              {p.recommended ? <div className="gr-pkg__badge">Recommended</div> : null}
              <div className="gr-pkg__name">{p.name}</div>
              <div className="gr-pkg__price">{p.price}</div>
              <ul className="gr-pkg__features">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="gr-offer-cta">
          <a className="gr-btn gr-btn--lg" href={partner.bookingUrl} target="_blank" rel="noopener noreferrer">
            {partner.bookingLabel}
          </a>
        </div>
      </section>

      {/* 8 · Lead capture / download */}
      <section className="gr-section gr-section--cta" id="report">
        <h2 className="gr-h2">Get your full report</h2>
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
        )}
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
