import Link from "next/link";
import type { OpportunityIntel } from "@/lib/opportunity";
import { ENTRY_PAID_PLAN } from "@/lib/subscription";

/**
 * The opportunity score, at the top of the company report, for everyone.
 *
 * The score is the one thing here that isn't just a re-presentation of the
 * register — it's a judgement. Keeping it entirely behind the paywall meant no
 * prospective customer ever saw what they'd be buying, so the total, the band
 * and the working are public. The gated value is the report underneath:
 * competitor set, market density, regional and keyword intelligence.
 *
 * The digital-presence group is a paid Places lookup that only runs for
 * unlocked users. It is shown as *not checked* rather than as zero — scoring it
 * zero would understate the company and overstate what upgrading changes.
 */
export function ScoreSummary({ opportunity, unlocked }: { opportunity: OpportunityIntel; unlocked: boolean }) {
  const { score, scoreBand, scoreVerdict, scoreCategories } = opportunity;
  const tone = score >= 70 ? "strong" : score >= 45 ? "mixed" : "limited";

  return (
    <section className="score-sum">
      <div className="score-sum__head">
        <div className="score-sum__dial">
          <div className={`score-sum__num score-sum__num--${tone}`}>
            {score}
            <span className="score-sum__den">/100</span>
          </div>
          <div
            className={`score-sum__meter score-sum__meter--${tone}`}
            role="img"
            aria-label={`Opportunity score ${score} out of 100 — ${scoreBand}`}
          >
            <span style={{ width: `${score}%` }} />
          </div>
          <div className={`score-sum__band score-sum__band--${tone}`}>{scoreBand}</div>
        </div>
        <div className="score-sum__copy">
          <h2 className="score-sum__title">Opportunity score</h2>
          <p className="score-sum__verdict">{scoreVerdict}</p>
          <p className="score-sum__note">
            How well this company matches a typical outreach or advisory brief — sector, stage, contactability and
            filing timing. It is not a credit, risk or financial-health rating, and it says nothing about how the
            business is run.
          </p>
        </div>
      </div>

      <ul className="score-cats">
        {scoreCategories.map((g) => {
          const pct = g.available ? Math.round((g.earned / g.available) * 100) : 0;
          return (
            <li className={"score-cat" + (g.measured ? "" : " score-cat--unmeasured")} key={g.key}>
              <div className="score-cat__top">
                <span className="score-cat__label">{g.label}</span>
                <span className="score-cat__pts mono">
                  {g.measured ? (
                    <>
                      {g.earned}
                      <span className="score-cat__avail">/{g.available}</span>
                    </>
                  ) : (
                    "not checked"
                  )}
                </span>
              </div>
              <div className="score-cat__bar" aria-hidden="true">
                <span style={{ width: g.measured ? `${pct}%` : "0%" }} />
              </div>
              <p className="score-cat__hint">
                {g.measured
                  ? g.lines.length
                    ? g.lines.join(" · ")
                    : `Nothing recorded — ${g.hint.toLowerCase()}.`
                  : g.hint}
              </p>
              {!g.measured ? (
                <Link className="score-cat__unlock" href={unlocked ? "/app/upgrade" : "/pricing"}>
                  Included in {ENTRY_PAID_PLAN.name} →
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="score-sum__src mono">
        Scored from the Companies House register{opportunity.digitalMeasured ? " and a live web/Places lookup" : ""}.
        Every point above is listed with its reason — nothing is inferred.
      </p>
    </section>
  );
}
