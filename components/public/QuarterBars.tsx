// A 12-quarter incorporation chart, server rendered.
//
// Motion spec: bars grow with scaleY from transform-origin:bottom, 35ms apart,
// left to right. Crucially the bar heights are percentages of an EXPLICIT plot
// track and the labels are a separate grid row — so a tall bar can never push
// a label out of the card, and the animation can never change layout.
//
// No client JS: the values are in the HTML and the growth is a CSS animation,
// which also means it is switched off by the reduced-motion query with
// everything else.
import type { QuarterPoint } from "@/lib/sector-trend";

export function QuarterBars({ points, label }: { points: QuarterPoint[]; label: string }) {
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <figure className="qb" aria-label={label}>
      <div className="qb__plot" role="img" aria-label={label}>
        {points.map((p, i) => (
          <div className="qb__col" key={p.from} style={{ "--i": i } as React.CSSProperties}>
            <div className="qb__track">
              <div
                className="qb__bar"
                style={{ height: `${Math.max((p.value / max) * 100, 2)}%` }}
                title={`${p.label}: ${p.value.toLocaleString("en-GB")}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="qb__axis" aria-hidden="true">
        {points.map((p, i) => (
          // Only the ends and the midpoint are labelled — twelve rotated labels
          // is noise, and this keeps every tick legible at 390px.
          <span className="qb__tick mono" key={p.from}>
            {i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2) ? p.label : ""}
          </span>
        ))}
      </div>
      <figcaption className="qb__cap mono">
        {points[points.length - 1]?.value.toLocaleString("en-GB")} in {points[points.length - 1]?.label}
      </figcaption>
    </figure>
  );
}
