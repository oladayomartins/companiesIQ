// ============================================================
// Research pipeline — charts
// ------------------------------------------------------------
// Charts are generated as static inline SVG and embedded straight
// into the article markdown. No client JS, no chart library, no
// image files: the numbers are in the served HTML, which is what
// makes them readable to a crawler and quotable by a language
// model. Every chart is paired with the same figures as a real
// markdown table, so nothing is locked inside a picture.
//
// Colour comes from the design tokens (--accent) with a literal
// fallback, and everything else is currentColor, so a chart is
// legible on the light blog surface and in dark mode without
// carrying its own palette.
// ============================================================
import type { Cell } from "./types";

const ACCENT = "var(--accent, #D9531F)";
const W = 720;

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-GB");
}

export function fmtPct(fraction: number | null | undefined, dp = 1): string {
  if (fraction === null || fraction === undefined || !Number.isFinite(fraction)) return "n/a";
  return `${(fraction * 100).toFixed(dp)}%`;
}

/** Signed percentage, e.g. "+12.4%" / "−5.9%" (true minus sign, not a hyphen). */
export function fmtDelta(fraction: number | null | undefined, dp = 1): string {
  if (fraction === null || fraction === undefined || !Number.isFinite(fraction)) return "n/a";
  const v = fraction * 100;
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(dp)}%`;
}

interface FigureOpts {
  /** Rendered as the chart's accessible name and the figure caption. */
  title: string;
  /** Accessible description — say what the chart shows, in words. */
  desc: string;
  /** Source line under the chart. */
  source: string;
  /** Fixed top of the value axis — 100 for a percentage chart, so bars read against the whole. */
  maxValue?: number;
  /** Value-label formatter; defaults to a whole number. */
  format?: (n: number) => string;
}

function figure(svg: string, o: FigureOpts): string {
  return `<figure class="rs-figure">
${svg}
<figcaption class="rs-figure__cap"><strong>${esc(o.title)}</strong><span>${esc(o.source)}</span></figcaption>
</figure>`;
}

function open(height: number, o: FigureOpts, id: string): string {
  return `<svg class="rs-chart" viewBox="0 0 ${W} ${height}" role="img" aria-labelledby="${id}-t ${id}-d" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;overflow:visible">
<title id="${id}-t">${esc(o.title)}</title><desc id="${id}-d">${esc(o.desc)}</desc>`;
}

let uid = 0;
const nextId = () => `c${(++uid).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Horizontal ranked bars — the workhorse for "top N by volume".
 * Labels sit left of the axis, values at the end of each bar.
 */
export function rankedBarChart(cells: Cell[], o: FigureOpts & { valueLabel?: string }): string {
  const id = nextId();
  const rows = cells.length;
  const rowH = 30;
  const top = 8;
  const height = top + rows * rowH + 10;
  const labelW = 232;
  const barX = labelW + 12;
  const barMax = W - barX - 74;
  const max = o.maxValue ?? Math.max(...cells.map((c) => c.value), 1);
  const fmt = o.format ?? fmtInt;

  const bars = cells
    .map((c, i) => {
      const y = top + i * rowH;
      const w = Math.max(2, (c.value / max) * barMax);
      return `<g><text x="${labelW}" y="${y + 15}" text-anchor="end" font-size="13" fill="currentColor">${esc(
        c.label.length > 34 ? c.label.slice(0, 33) + "…" : c.label
      )}</text><rect x="${barX}" y="${y + 4}" width="${w.toFixed(1)}" height="16" rx="3" fill="${ACCENT}" opacity="${(
        1 - i * 0.028
      ).toFixed(3)}"></rect><text x="${(barX + w + 8).toFixed(1)}" y="${y + 16}" font-size="12.5" fill="currentColor" opacity="0.75" font-variant-numeric="tabular-nums">${fmt(
        c.value
      )}</text></g>`;
    })
    .join("\n");

  return figure(`${open(height, o, id)}
<line x1="${barX}" y1="${top}" x2="${barX}" y2="${height - 8}" stroke="currentColor" stroke-opacity="0.18"></line>
${bars}
</svg>`, o);
}

/**
 * Two bars per row — this period against the same period a year earlier.
 * The comparison bar is deliberately unsaturated so the current period reads first.
 */
export function yearOnYearChart(cells: Cell[], o: FigureOpts & { currentLabel: string; previousLabel: string }): string {
  const id = nextId();
  const rowH = 38;
  const top = 30;
  const height = top + cells.length * rowH + 12;
  const labelW = 232;
  const barX = labelW + 12;
  const barMax = W - barX - 78;
  const max = Math.max(...cells.flatMap((c) => [c.value, c.prev ?? 0]), 1);

  const legend = `<g font-size="12" fill="currentColor"><rect x="${barX}" y="4" width="11" height="11" rx="2" fill="${ACCENT}"></rect><text x="${
    barX + 17
  }" y="14">${esc(o.currentLabel)}</text><rect x="${barX + 100}" y="4" width="11" height="11" rx="2" fill="currentColor" opacity="0.22"></rect><text x="${
    barX + 117
  }" y="14" opacity="0.8">${esc(o.previousLabel)}</text></g>`;

  const rows = cells
    .map((c, i) => {
      const y = top + i * rowH;
      const wNow = Math.max(2, (c.value / max) * barMax);
      const wPrev = Math.max(1, ((c.prev ?? 0) / max) * barMax);
      const delta = fmtDelta(c.changePct);
      return `<g><text x="${labelW}" y="${y + 17}" text-anchor="end" font-size="13" fill="currentColor">${esc(
        c.label.length > 34 ? c.label.slice(0, 33) + "…" : c.label
      )}</text><rect x="${barX}" y="${y + 2}" width="${wNow.toFixed(1)}" height="12" rx="2.5" fill="${ACCENT}"></rect><rect x="${barX}" y="${
        y + 17
      }" width="${wPrev.toFixed(1)}" height="12" rx="2.5" fill="currentColor" opacity="0.22"></rect><text x="${(
        Math.max(wNow, wPrev) + barX + 8
      ).toFixed(1)}" y="${y + 17}" font-size="12.5" fill="currentColor" opacity="0.75" font-variant-numeric="tabular-nums">${fmtInt(
        c.value
      )} <tspan opacity="0.75">(${esc(delta)})</tspan></text></g>`;
    })
    .join("\n");

  return figure(`${open(height, o, id)}
${legend}
<line x1="${barX}" y1="${top - 4}" x2="${barX}" y2="${height - 8}" stroke="currentColor" stroke-opacity="0.18"></line>
${rows}
</svg>`, o);
}

/**
 * Diverging bars around a zero axis — growth and decline in one frame.
 * Values are percentages (fractions); rows should already be sorted.
 */
export function divergingChart(cells: Cell[], o: FigureOpts): string {
  const id = nextId();
  const rowH = 28;
  const top = 8;
  const height = top + cells.length * rowH + 10;
  const labelW = 232;
  const zero = labelW + 12 + (W - labelW - 12 - 60) / 2;
  const half = (W - labelW - 12 - 60) / 2 - 8;
  const max = Math.max(...cells.map((c) => Math.abs(c.changePct ?? 0)), 0.01);

  const rows = cells
    .map((c, i) => {
      const y = top + i * rowH;
      const v = c.changePct ?? 0;
      const w = Math.max(1.5, (Math.abs(v) / max) * half);
      const x = v >= 0 ? zero : zero - w;
      const up = v >= 0;
      return `<g><text x="${labelW}" y="${y + 15}" text-anchor="end" font-size="13" fill="currentColor">${esc(
        c.label.length > 34 ? c.label.slice(0, 33) + "…" : c.label
      )}</text><rect x="${x.toFixed(1)}" y="${y + 5}" width="${w.toFixed(1)}" height="14" rx="2.5" fill="${
        up ? ACCENT : "currentColor"
      }" opacity="${up ? "0.95" : "0.35"}"></rect><text x="${(up ? x + w + 7 : x - 7).toFixed(1)}" y="${y + 16}" text-anchor="${
        up ? "start" : "end"
      }" font-size="12.5" fill="currentColor" opacity="0.75" font-variant-numeric="tabular-nums">${esc(fmtDelta(v))}</text></g>`;
    })
    .join("\n");

  return figure(`${open(height, o, id)}
<line x1="${zero}" y1="${top}" x2="${zero}" y2="${height - 8}" stroke="currentColor" stroke-opacity="0.3"></line>
${rows}
</svg>`, o);
}

/** Monthly (or weekly) columns — volume over time within the period. */
export function columnChart(points: { label: string; value: number }[], o: FigureOpts): string {
  const id = nextId();
  const height = 260;
  const padL = 56;
  const padB = 34;
  const padT = 14;
  const plotW = W - padL - 16;
  const plotH = height - padB - padT;
  const max = Math.max(...points.map((p) => p.value), 1);
  const niceMax = o.maxValue ?? (Math.ceil(max / 5000) * 5000 || max);
  const fmt = o.format ?? fmtInt;
  const bw = Math.min(64, (plotW / points.length) * 0.62);
  const step = plotW / points.length;

  const gridlines = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const y = padT + plotH - f * plotH;
      return `<line x1="${padL}" y1="${y}" x2="${W - 16}" y2="${y}" stroke="currentColor" stroke-opacity="0.12"></line><text x="${
        padL - 8
      }" y="${y + 4}" text-anchor="end" font-size="11.5" fill="currentColor" opacity="0.6" font-variant-numeric="tabular-nums">${fmt(
        niceMax * f
      )}</text>`;
    })
    .join("");

  const cols = points
    .map((p, i) => {
      const h = (p.value / niceMax) * plotH;
      const x = padL + i * step + (step - bw) / 2;
      const y = padT + plotH - h;
      return `<g><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, h).toFixed(
        1
      )}" rx="3" fill="${ACCENT}"></rect><text x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(
        1
      )}" text-anchor="middle" font-size="11.5" fill="currentColor" opacity="0.75" font-variant-numeric="tabular-nums">${fmt(
        p.value
      )}</text><text x="${(x + bw / 2).toFixed(1)}" y="${height - 12}" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.8">${esc(
        p.label
      )}</text></g>`;
    })
    .join("\n");

  return figure(`${open(height, o, id)}
${gridlines}
${cols}
</svg>`, o);
}

/** A GFM table. Every chart in an article is mirrored by one of these. */
export function markdownTable(headers: string[], rows: (string | number)[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const rule = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.map((c) => String(c)).join(" | ")} |`).join("\n");
  return `${head}\n${rule}\n${body}`;
}
