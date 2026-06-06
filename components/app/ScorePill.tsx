import type { ScoreBreakdown } from "@/lib/scoring";

export function ScorePill({ score }: { score?: ScoreBreakdown }) {
  if (!score) return <span className="muted">—</span>;
  return (
    <span className={`score-pill score-pill--${score.band.toLowerCase()}`} title={`Industry ${score.industryDemand} · Growth ${score.growth} · Location ${score.locationDemand} · Keywords ${score.keywordSignals}`}>
      {score.total}
      <span className="score-pill__band">{score.band}</span>
    </span>
  );
}

export function KeywordChips({ keywords = [], strong = [] }: { keywords?: string[]; strong?: string[] }) {
  if (!keywords.length) return null;
  return (
    <span className="kw-chips">
      {keywords.slice(0, 4).map((k) => (
        <span key={k} className={"kw-chip" + (strong.includes(k) ? " kw-chip--strong" : "")}>
          {k}
        </span>
      ))}
    </span>
  );
}
