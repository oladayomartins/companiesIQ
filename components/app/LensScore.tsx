"use client";
// The score card and the fingerprint strip.
//
// The gauge is a single accent arc — no needle, no red-to-green rainbow sweep.
// A rainbow says "40 is bad", which is not what a score means: it is a position
// on a range, so the range is drawn underneath as three named bands instead.
// Every point is traceable — each ledger row carries its own weight and reason,
// and rows we could not measure are shown greyed and excluded from the maths.
import { useId, useState } from "react";
import { CountUp } from "@/components/public/CountUp";
import { Card, CardBody, Icon, Badge } from "@/components/ds";
import type { LensScore, LedgerRow, Tone, LensKey } from "@/lib/lens";
import { LENSES } from "@/lib/lens";

const toneClass = (t: Tone) => `is-${t}`;

function Arc({ score, size = 168 }: { score: number; size?: number }) {
  const id = useId();
  const stroke = 13;
  const r = (size - stroke) / 2;
  // A 240° arc opening downward: enough sweep to read as a gauge, enough gap
  // that the number inside it never fights the stroke.
  const sweep = 240;
  const start = 150;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const pt = (deg: number) => [size / 2 + r * Math.cos(rad(deg)), size / 2 + r * Math.sin(rad(deg))];
  const arcPath = (from: number, to: number) => {
    const [x1, y1] = pt(from);
    const [x2, y2] = pt(to);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const end = start + (sweep * Math.max(0, Math.min(100, score))) / 100;

  return (
    <svg className="arc" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${score} out of 100`}>
      <path className="arc__track" d={arcPath(start, start + sweep)} strokeWidth={stroke} fill="none" strokeLinecap="round" />
      {score > 0 ? (
        <path className="arc__fill" d={arcPath(start, end)} strokeWidth={stroke} fill="none" strokeLinecap="round" key={id} />
      ) : null}
    </svg>
  );
}

// Bands mirror bandOf() in lib/lens.ts: low < 34, moderate 34–66, strong 67+.
const BANDS = [
  { key: "low", label: "Low", from: 0, to: 34 },
  { key: "moderate", label: "Moderate", from: 34, to: 67 },
  { key: "strong", label: "Strong", from: 67, to: 101 },
] as const;

/**
 * One ledger row as a disclosure: the label, weight and bar are the button;
 * the reason (and, where the lens has one, what to ask) is the panel. The
 * panel is always rendered — `hidden` when closed — so every reason is in the
 * server HTML.
 */
function LedgerItem({
  row,
  open,
  onToggle,
  ask,
  id,
}: {
  row: LedgerRow;
  open: boolean;
  onToggle: () => void;
  ask?: string | null;
  id: string;
}) {
  return (
    <div className={`ledger__item ${toneClass(row.tone)}${row.measured ? "" : " is-unmeasured"}${open ? " is-open" : ""}`}>
      <button type="button" className="ledger__row" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <span className="ledger__label">
          {row.label}
          <span className="ledger__weight mono">
            {row.weight}%{row.invert ? " · lower is better" : ""}
          </span>
        </span>
        <span className="ledger__bar" aria-hidden="true">
          <span className="ledger__fill" style={{ width: `${row.measured ? row.pct : 0}%` }} />
        </span>
        <span className="ledger__state mono">{row.measured ? row.state : "Not checked"}</span>
        <Icon name="chevronRight" size={13} className="ledger__chev" />
      </button>
      <div className="ledger__why" id={id} hidden={!open}>
        {row.reason}
        {!row.measured ? " Left out of the score rather than counted as zero." : ""}
        {ask ? <div className="ledger__ask">→ {ask}</div> : null}
      </div>
    </div>
  );
}

export function LensScoreCard({
  score,
  weakest,
  asks,
  sources = "Companies House · ONS · Nomis",
}: {
  score: LensScore;
  /** The row dragging the score down most (lens-view weakestRow). */
  weakest?: LedgerRow | null;
  /** "What to ask" per ledger label, when the lens has copy for it. */
  asks?: Record<string, string>;
  sources?: string;
}) {
  const [open, setOpen] = useState<number | null>(0);
  const uid = useId();
  const lens = LENSES[score.lens];

  return (
    <Card className="scorecard">
      <CardBody>
        <div className="scorecard__top">
          <span className="app-eyebrow">Opportunity score</span>
          <span className={`scorecard__conf mono is-${score.confidence}`}>
            <span className="scorecard__confdot" aria-hidden="true" />
            Confidence {score.confidence}
          </span>
        </div>

        <div className="scorecard__grid">
          <div className="scorecard__left">
            <div className="scorecard__hero">
              <div className="scorecard__gauge">
                <Arc score={score.score} size={128} />
                <div className="scorecard__num">
                  <span className="scorecard__value">
                    <CountUp value={score.score} />
                  </span>
                  <span className="scorecard__outof mono">out of 100</span>
                </div>
              </div>

              <div className="scorecard__verdict">
                <div className="scorecard__verdictTitle">{score.verdict}</div>
                <p className="scorecard__verdictSub">{score.sub}</p>
                <div className="scorecard__bands" role="img" aria-label={`${score.band} band`}>
                  {BANDS.map((b) => (
                    <span
                      key={b.key}
                      className={`scorecard__band mono${b.key === score.band ? " is-on" : ""}`}
                      style={{ flexGrow: b.to - b.from }}
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
                <div className="scorecard__scale mono" aria-hidden="true">
                  <span>0</span>
                  <span>34</span>
                  <span>67</span>
                  <span>100</span>
                </div>
              </div>
            </div>

            {weakest ? (
              <div className="scorecard__weak">
                <div className="scorecard__weakk mono">Weakest point · what to do about it</div>
                <div className="scorecard__weakt">
                  {weakest.label} <span className="mono">· {weakest.weight}% weight</span>
                </div>
                <p className="scorecard__weakr">{weakest.reason}</p>
                {asks?.[weakest.label] ? <div className="scorecard__weaka">→ {asks[weakest.label]}</div> : null}
              </div>
            ) : null}
          </div>

          <div className="scorecard__right">
            <div className="ledger__head mono">
              <span>What we checked · weight</span>
              <span>Select a row for why</span>
            </div>
            <div className="ledger">
              {score.ledger.map((r, i) => (
                <LedgerItem
                  key={r.label}
                  row={r}
                  id={`${uid}-why-${i}`}
                  open={open === i}
                  onToggle={() => setOpen((o) => (o === i ? null : i))}
                  ask={asks?.[r.label]}
                />
              ))}
            </div>
            <p className="scorecard__src mono">
              {sources} · {lens.label} model · {score.coverage}% of the model measurable
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export interface FingerprintCell {
  label: string;
  value: number;
  trend: "up" | "flat" | "down";
  state: string;
  tone: Tone;
}

export function Fingerprint({
  cells,
  peers,
  lensKey,
  lensScore,
}: {
  cells: FingerprintCell[];
  peers: number;
  lensKey: LensKey;
  lensScore: LensScore;
}) {
  const arrow = (t: FingerprintCell["trend"]) => (t === "up" ? "↑" : t === "down" ? "↓" : "●");
  return (
    <Card>
      <CardBody>
        <div className="fp__head">
          <span className="app-eyebrow">Company fingerprint</span>
          <span className="fp__sub mono">Indexed 0–100 against {peers.toLocaleString("en-GB")} sector peers</span>
        </div>
        <div className="fp">
          {cells.map((c) => (
            <div className={`fp__cell ${toneClass(c.tone)}`} key={c.label}>
              <span className="fp__label mono">{c.label}</span>
              <span className="fp__value">{c.value}</span>
              <span className="fp__state">
                <span className="fp__arrow" aria-hidden="true">{arrow(c.trend)}</span> {c.state}
              </span>
            </div>
          ))}
          <div className="fp__cell is-lens">
            <span className="fp__label mono">{LENSES[lensKey].short} fit</span>
            <span className="fp__value">{lensScore.score}</span>
            <span className="fp__state">
              <Badge tone={lensScore.band === "strong" ? "pos" : lensScore.band === "moderate" ? "accent" : "neutral"}>
                {lensScore.verdict}
              </Badge>
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
