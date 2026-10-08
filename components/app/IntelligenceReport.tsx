import Link from "next/link";
import { Card, CardHeader, CardBody, Badge, Icon } from "@/components/ds";
import type { IntelligenceReport as Report } from "@/lib/analytics";
import type { CompanyEnrichment } from "@/lib/enrichment/types";
import type { OpportunityIntel } from "@/lib/opportunity";
import { AddToProspect, type ProspectTarget } from "@/components/app/AddToProspect";
import { ContactIntelligence } from "@/components/app/ContactIntelligence";

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
  opportunity = null,
  prospect = null,
  contactEntitled = false,
  contactRemaining = null,
}: {
  report: Report;
  // Accepted for call-site compatibility; the opportunity object already
  // encapsulates the enrichment-derived facts shown in the report.
  enrichment?: CompanyEnrichment | null;
  /** Does this reader's plan include verified contact discovery? */
  contactEntitled?: boolean;
  /** Contact lookups left this month; -1 = unlimited, null = not applicable. */
  contactRemaining?: number | null;
  opportunity?: OpportunityIntel | null;
  // When set (unlocked, in-app), shows the "Add to prospect list" action.
  prospect?: ProspectTarget | null;
}) {
  const r = report;
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

            {/* Digital presence & contact. Same four Places-measured rows this
                section always had, now with the one thing they lacked: a way to
                go and find out. Contact discovery renders in place rather than
                as a card of its own — the report already stated digital
                presence twice, and a third statement in a new card would have
                made a long page longer. */}
            <ContactIntelligence
              number={r.overview.number}
              companyName={r.overview.name}
              digital={opportunity.digital}
              measured={opportunity.digitalMeasured}
              entitled={contactEntitled}
              remaining={contactRemaining}
            />

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

      <p className="report__disclaimer">
        CompaniesIQ presents evidence drawn from Companies House, ONS and Nomis. Figures marked &ldquo;derived&rdquo; are
        estimated from registered-office region and published baselines. This briefing is educational and does not
        constitute financial advice.
      </p>
    </div>
  );
}
