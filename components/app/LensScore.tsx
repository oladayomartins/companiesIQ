"use client";
// The score card and the fingerprint strip.
//
// The gauge is a single accent arc — no needle, no red-to-green rainbow sweep.
// A rainbow says "40 is bad", which is not what a score means: it is a position
// on a range, so the range is drawn underneath as three named bands instead.
// Every point is traceable — each ledger row carries its own weight and reason,
// and rows we could not measure are shown greyed and excluded from the maths.
import { useId, useState } from "react";
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

function Ledger({ rows }: { rows: LedgerRow[] }) {
  return (
    <div className="ledger">
      {rows.map((r) => (
        <div className={`ledger__row ${toneClass(r.tone)}${r.measured ? "" : " is-unmeasured"}`} key={r.label}>
          <span className="ledger__label">
            {r.label}
            <span className="ledger__weight mono">{r.weight}%</span>
          </span>
          <span className="ledger__bar" aria-hidden="true">
            <span className="ledger__fill" style={{ width: `${r.measured ? r.pct : 0}%` }} />
          </span>
          <span className="ledger__state mono">{r.measured ? r.state : "Not checked"}</span>
        </div>
      ))}
    </div>
  );
}

export function LensScoreCard({
  score,
  updated,
  delta,
}: {
  score: LensScore;
  updated?: string;
  delta?: string | null;
}) {
  const [why, setWhy] = useState(false);
  const lens = LENSES[score.lens];
  const bands: { key: string; label: string }[] = [
    { key: "low", label: "Low" },
    { key: "moderate", label: "Moderate" },
    { key: "strong", label: "Strong" },
  ];

  return (
    <Card className="scorecard">
      <CardBody>
        <div className="scorecard__top">
          <span className="app-eyebrow">Opportunity score</span>
          {delta ? <span className="scorecard__delta mono">{delta}</span> : null}
        </div>

        <div className="scorecard__hero">
          <div className="scorecard__gauge">
            <Arc score={score.score} />
            <div className="scorecard__num">
              <span className="scorecard__value">{score.score}</span>
              <span className="scorecard__outof mono">out of 100</span>
            </div>
          </div>

          <div className="scorecard__verdict">
            <div className="scorecard__verdictTitle">{score.verdict}</div>
            <p className="scorecard__verdictSub">{score.sub}</p>
            <div className="scorecard__bands" role="img" aria-label={`Band: ${score.band}`}>
              {bands.map((b) => (
                <span key={b.key} className={`scorecard__band mono${b.key === score.band ? " is-on" : ""}`}>
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <Ledger rows={score.ledger} />

        <button className="scorecard__why" onClick={() => setWhy((v) => !v)} aria-expanded={why}>
          Why this score? <Icon name="chevronDown" size={14} style={why ? { transform: "rotate(180deg)" } : undefined} />
        </button>
        {why ? (
          <div className="scorecard__whybody">
            <div className="mono scorecard__model">{lens.label} weighting · {score.coverage}% of the model measurable</div>
            <p>{score.why}</p>
            <p className="scorecard__src mono">Source · Companies House, ONS &amp; Nomis{updated ? ` · updated ${updated}` : ""}</p>
          </div>
        ) : null}
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
