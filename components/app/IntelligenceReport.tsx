import Link from "next/link";
import { Card, CardHeader, CardBody, Badge, Icon } from "@/components/ds";
import type { IntelligenceReport as Report, SimilarCompany } from "@/lib/analytics";
import type { CompanyEnrichment } from "@/lib/enrichment/types";
import type { OpportunityIntel, DigitalFact } from "@/lib/opportunity";
import type { DirectorNetwork } from "@/lib/network";
import type { Filing } from "@/lib/types";
import { toTimeline } from "@/lib/changes";
import { AddToProspect, type ProspectTarget } from "@/components/app/AddToProspect";
import { fmtDate } from "@/lib/format";

function Source({ children }: { children: React.ReactNode }) {
  return (
    <div className="source">
      <span className="source__dot">●</span> Source · {children}
    </div>
  );
}

function SectionHead({ n, title }: { n: number; title: string }) {
  return (
    <div className="rsec__head">
      <span className="rsec__n mono">{String(n).padStart(2, "0")}</span>
      <h3 className="rsec__title">{title}</h3>
    </div>
  );
}

// One digital-presence fact row — a confident, sourced statement. Detected →
// the value (a link where it is one); not detected → an explicit "Not detected";
// not assessed → "Not assessed" (we never guess).
function FactRow({ fact }: { fact: DigitalFact }) {
  const tone = fact.state === "detected" ? "pos" : fact.state === "not_detected" ? "warn" : "neutral";
  const text = fact.state === "detected" ? fact.value ?? "Detected" : fact.state === "not_detected" ? fact.value ?? "Not detected" : "Not assessed";
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

function OppRow({ tone, children }: { tone: "good" | "watch" | "neutral"; children: React.ReactNode }) {
  return (
    <div className={`opp-row opp-row--${tone}`}>
      <span className="opp-row__mark" aria-hidden="true">
        {tone === "good" ? "✓" : tone === "watch" ? "!" : "•"}
      </span>
      <span>{children}</span>
    </div>
  );
}

export function IntelligenceReport({
  report,
  similar = [],
  opportunity = null,
  prospect = null,
  network = null,
  filings = [],
}: {
  report: Report;
  similar?: SimilarCompany[];
  // Accepted for call-site compatibility; the opportunity object already
  // encapsulates the enrichment-derived facts shown in the report.
  enrichment?: CompanyEnrichment | null;
  opportunity?: OpportunityIntel | null;
  // When set (unlocked, in-app), shows the "Add to prospect list" action.
  prospect?: ProspectTarget | null;
  network?: DirectorNetwork | null;
  filings?: Filing[];
}) {
  const r = report;
  const changes = toTimeline(filings);
  return (
    <div className="report">
      <p className="report__intro">
        A market briefing for {r.overview.name}, assembled from the public register and official economic data. Every
        figure below is sourced and dated — educational, not promotional.
      </p>

      {/* 1 · Opportunity intelligence — the lead-qualification view */}
      {opportunity ? (
        <Card>
          <CardHeader children={<SectionHead n={1} title="Signals &amp; evidence" />} action={<Badge tone="accent">Lead view</Badge>} />
          <CardBody>
            {/* This section used to print its own "Opportunity signal score
                /100" — a SECOND number, from a different model, sitting a few
                hundred pixels below the score card's own /100. Two scores with
                the same name and different values invite the reader to distrust
                both, which is an expensive thing to do to a product whose whole
                claim is "evidence first". There is now one score (the lens card
                at the top, with its own ledger and working), and this section is
                the evidence underneath it. */}
            <p className="rsec__note">
              The verified signals behind the opportunity score for {r.overview.name}. Facts come from the public record
              and Google Places. Sector and provider notes are labelled as common patterns — not claims about this
              company.
            </p>

            <div className="opp-signals opp-signals--wide">
              {opportunity.signals.length ? (
                opportunity.signals.map((s, i) => (
                  <span key={i} className={`opp-chip opp-chip--${s.tone}`}>
                    {s.tone === "good" ? "✓" : s.tone === "watch" ? "⚠" : "•"} {s.label}
                    {s.detail ? ` · ${s.detail}` : ""}
                  </span>
                ))
              ) : (
                <span className="rsec__note">No notable signals on the public record.</span>
              )}
            </div>

            {prospect ? (
              <div className="opp-cta">
                <AddToProspect company={prospect} />
              </div>
            ) : null}

            {/* Digital presence — verified facts */}
            <div className="opp-block">
              <div className="opp-block__title">
                Digital presence
                <Badge tone={opportunity.digitalMeasured ? "pos" : "neutral"}>
                  {opportunity.digitalMeasured ? "Measured" : "Not assessed"}
                </Badge>
              </div>
              <div className="readiness">
                <FactRow fact={opportunity.digital.website} />
                <FactRow fact={opportunity.digital.gbp} />
                <FactRow fact={opportunity.digital.reviews} />
                <FactRow fact={opportunity.digital.phone} />
              </div>
              {opportunity.digitalMeasured ? (
                <Source>Google Places · public business listing</Source>
              ) : (
                <p className="rsec__note">Measured from Google Places when a confident match exists; otherwise shown as Not assessed (never assumed).</p>
              )}
            </div>

            {/* Compliance & register — verified facts */}
            <div className="opp-block">
              <div className="opp-block__title">Compliance &amp; register signals</div>
              <div className="opp-list">
                {opportunity.compliance.map((s, i) => (
                  <OppRow key={i} tone={s.tone}>
                    {s.label}
                    {s.detail ? ` — ${s.detail}` : ""}
                  </OppRow>
                ))}
              </div>
              <Source>Companies House · public filing record</Source>
            </div>

            {/* Category 2 — sector norms (clearly labelled) */}
            <div className="opp-cols">
              <div className="opp-block">
                <div className="opp-block__title">Likely relevant · sector norms</div>
                <p className="rsec__note">
                  Businesses in {opportunity.sector} commonly invest in the following. A general pattern for the sector —
                  not an assessment of this company&apos;s needs.
                </p>
                <div className="opp-tags">
                  {opportunity.commonlyInvests.map((x) => (
                    <span className="opp-tag" key={x}>{x}</span>
                  ))}
                </div>
              </div>
              <div className="opp-block">
                <div className="opp-block__title">Commonly relevant to</div>
                <p className="rsec__note">Provider types that typically serve a company with this profile.</p>
                <div className="opp-tags">
                  {opportunity.relevantFor.map((x) => (
                    <span className="opp-tag opp-tag--prov" key={x}>{x}</span>
                  ))}
                </div>
              </div>
            </div>

          </CardBody>
        </Card>
      ) : null}

      {/* 2 · Recent changes — the "what changed" timeline */}
      {changes.length ? (
        <Card>
          <CardHeader children={<SectionHead n={2} title="Recent changes" />} action={<Badge tone="accent">Timeline</Badge>} />
          <CardBody>
            <p className="rsec__note">
              What&apos;s changed at {r.overview.name} lately — directly from its Companies House filing history.
            </p>
            <ol className="timeline">
              {changes.map((ev, i) => (
                <li className={`tl-row tl-row--${ev.tone}`} key={i}>
                  <span className="tl-row__icon" aria-hidden="true">
                    <Icon name={ev.icon} size={15} />
                  </span>
                  <span className="tl-row__body">
                    <span className="tl-row__label">{ev.label}</span>
                    {ev.detail ? <span className="tl-row__detail">{ev.detail}</span> : null}
                  </span>
                  <span className="tl-row__date mono">{fmtDate(ev.date)}</span>
                </li>
              ))}
            </ol>
            <Source>Companies House · filing history</Source>
          </CardBody>
        </Card>
      ) : null}

      {/* 3 · Business overview */}
      <Card>
        <CardHeader children={<SectionHead n={3} title="Business overview" />} />
        <CardBody>
          <dl className="detail-list">
            <div>
              <dt>Company</dt>
              <dd>{r.overview.name}</dd>
            </div>
            <div>
              <dt>Company number</dt>
              <dd className="mono">{r.overview.number}</dd>
            </div>
            <div>
              <dt>Incorporated</dt>
              <dd className="mono">{fmtDate(r.overview.incorporated)}</dd>
            </div>
            <div>
              <dt>Industry classification</dt>
              <dd>
                {r.overview.classification} · {r.overview.sector}
              </dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{r.overview.location}</dd>
            </div>
            <div>
              <dt>Company type</dt>
              <dd>{r.overview.type || "—"}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      {/* 11 · Similar companies */}
      <Card>
        <CardHeader children={<SectionHead n={4} title="Similar companies" />} action={<Badge tone="neutral">{similar.length}</Badge>} />
        <CardBody>
          {similar.length ? (
            <div className="sim-list">
              {similar.map((s) => (
                <Link key={s.number} href={`/company/${s.number}`} className="sim-row">
                  <div className="sim-row__main">
                    <div className="sim-row__name">{s.name}</div>
                    <div className="sim-row__meta mono">
                      {s.number}
                      {s.sicCode ? ` · SIC ${s.sicCode}` : ""}
                      {s.region ? ` · ${s.region}` : ""}
                    </div>
                  </div>
                  <Icon name="chevronRight" size={15} className="sim-row__chev" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="rsec__note">No active companies found with the same SIC code.</p>
          )}
          <Source>Companies House · same SIC code (same-region first)</Source>
        </CardBody>
      </Card>

      {/* 12 · Connected companies (shared directors) */}
      {network && network.connections.length ? (
        <Card>
          <CardHeader
            children={<SectionHead n={5} title="Connected companies" />}
            action={<Badge tone="accent">Director network</Badge>}
          />
          <CardBody>
            <p className="rsec__note">
              Other active companies that share a director with {r.overview.name} — checked across{" "}
              {network.directorsChecked} director{network.directorsChecked === 1 ? "" : "s"}. A factual map of connected
              entities from the officer-appointments register.
            </p>
            <div className="sim-list">
              {network.connections.map((conn) => (
                <Link key={conn.number} href={`/company/${conn.number}`} className="sim-row">
                  <div className="sim-row__main">
                    <div className="sim-row__name">{conn.name}</div>
                    <div className="sim-row__meta mono">
                      {conn.number}
                      {conn.sector ? ` · ${conn.sector}` : ""} · via {conn.viaDirectors.join(", ")}
                    </div>
                  </div>
                  <Icon name="chevronRight" size={15} className="sim-row__chev" />
                </Link>
              ))}
            </div>
            <Source>Companies House · officer appointments</Source>
          </CardBody>
        </Card>
      ) : null}

      <p className="report__disclaimer">
        CompaniesIQ presents evidence drawn from Companies House, ONS and Nomis. Figures marked &ldquo;derived&rdquo; are
        estimated from registered-office region and published baselines. This briefing is educational and does not
        constitute financial advice.
      </p>
    </div>
  );
}
