// ============================================================
// Research pipeline — publication gates
// ------------------------------------------------------------
// The pipeline publishes without a human in the loop, so the
// checks a human would have done have to run as code. A study run
// that fails any BLOCKING check is written as a draft and reported
// instead of going live: a wrong number under a research byline
// costs more than a late report.
//
// Checks fall into two classes:
//   · integrity — does the data hold together? (months must sum to
//     the period total, a part cannot exceed the whole, a year-on-
//     year swing beyond a plausible band means something broke);
//   · publication — is the article safe to serve? (no broken
//     internal links, no unrendered placeholders, required caveats
//     actually present, metadata within limits).
// ============================================================
import { CURATED_SIC_CODES } from "@/lib/sic";
import { CITIES } from "@/lib/cities";
import { SECTOR_STATS, REGION_STATS } from "@/lib/ons";
import { SIGNALS } from "@/lib/signals";
import { slugify } from "@/lib/slug";
import type { Cell, Dataset, PostDraft } from "./types";

export interface Issue {
  level: "block" | "warn";
  check: string;
  detail: string;
}

/** Static pages a research article is allowed to link to. */
const STATIC_ROUTES = new Set([
  "/", "/search", "/pricing", "/sources", "/blog", "/free-alerts", "/data", "/product", "/about", "/contact",
  "/sic", "/industry", "/city", "/market", "/signals", "/use-cases", "/alternatives",
  "/company-database", "/company-monitoring", "/companies-house-alternative", "/business-leads",
]);

function routeExists(path: string): boolean {
  const clean = path.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  if (STATIC_ROUTES.has(clean)) return true;
  const seg = clean.split("/").filter(Boolean);
  if (seg.length === 2) {
    const [base, key] = seg;
    if (base === "sic") return CURATED_SIC_CODES.includes(key);
    if (base === "industry") return Object.values(SECTOR_STATS).some((s) => slugify(s.sector) === key);
    if (base === "city") return CITIES.some((c) => slugify(c.name) === key);
    if (base === "market") return Object.values(REGION_STATS).some((r) => slugify(r.region) === key);
    if (base === "signals") return SIGNALS.some((s) => s.slug === key);
    if (base === "use-cases" || base === "alternatives" || base === "blog") return true; // checked separately
  }
  if (seg.length === 3 && seg[0] === "industry") {
    return Object.values(SECTOR_STATS).some((s) => slugify(s.sector) === seg[1]) && CITIES.some((c) => slugify(c.name) === seg[2]);
  }
  return false;
}

/** Every markdown link target in a body, deduplicated. */
export function linksIn(md: string): string[] {
  const out = new Set<string>();
  for (const m of md.matchAll(/\]\(([^)\s]+)/g)) out.add(m[1]);
  return [...out];
}

/**
 * A year-on-year move beyond this band is almost never a market shift. In UK
 * register data it usually means a bulk registration event at a single address
 * — the Companies House default address in Cardiff being the clearest example.
 * Flagged rows are published but never used as a headline finding.
 */
export const ANOMALY_BAND = 0.75;

/** Flag outsized movers in place and return them. */
export function markAnomalies(cells: Cell[], band = ANOMALY_BAND): Cell[] {
  const flagged: Cell[] = [];
  for (const c of cells) {
    if (c.changePct !== null && c.changePct !== undefined && Math.abs(c.changePct) > band) {
      c.anomaly = true;
      flagged.push(c);
    }
  }
  return flagged;
}

const TOLERANCE_MONTH_SUM = 0.01; // months must account for the period within 1%
const MAX_PLAUSIBLE_YOY = 0.4; // a >40% swing in national formations means something broke

export function checkDataset(d: Dataset): Issue[] {
  const issues: Issue[] = [];
  const total = d.totals.incorporations ?? 0;

  if (!total) issues.push({ level: "block", check: "totals", detail: "Period total is zero — the register returned nothing for this window." });

  const top = d.series.find((s) => s.id === "top")?.cells ?? [];
  if (top.length < 10) issues.push({ level: "block", check: "coverage", detail: `Only ${top.length} ranked rows; expected at least 10.` });
  for (const c of top) {
    if (!Number.isFinite(c.value) || c.value < 0) issues.push({ level: "block", check: "values", detail: `Row ${c.key} has a non-finite or negative value.` });
    if (c.value > total) issues.push({ level: "block", check: "part-exceeds-whole", detail: `Row ${c.key} (${c.value}) exceeds the period total (${total}).` });
  }

  const monthly = d.series.find((s) => s.id === "monthly")?.cells ?? [];
  if (monthly.length) {
    const sum = monthly.reduce((a, b) => a + b.value, 0);
    const drift = Math.abs(sum - total) / (total || 1);
    if (drift > TOLERANCE_MONTH_SUM) {
      issues.push({
        level: "block",
        check: "month-sum",
        detail: `Monthly counts sum to ${sum} but the period total is ${total} (${(drift * 100).toFixed(2)}% apart). One of the two queries is wrong.`,
      });
    }
    if (monthly.some((m) => m.value === 0)) issues.push({ level: "block", check: "month-gap", detail: "A month in the period returned zero incorporations." });
  }

  const yoy = d.totals.changePct;
  if (d.comparison) {
    if (!d.totals.prevIncorporations) issues.push({ level: "block", check: "comparison", detail: "Comparison period returned no companies." });
    else if (Math.abs(yoy) > (d.totals.maxPlausibleYoy ?? MAX_PLAUSIBLE_YOY)) {
      issues.push({
        level: "block",
        check: "yoy-plausibility",
        detail: `Year-on-year change of ${(yoy * 100).toFixed(1)}% exceeds the ±${(d.totals.maxPlausibleYoy ?? MAX_PLAUSIBLE_YOY) * 100}% plausibility band. Check the period boundaries before publishing.`,
      });
    }
  }

  for (const s of d.series) {
    for (const c of s.cells.filter((x) => x.anomaly)) {
      issues.push({
        level: "warn",
        check: "outlier",
        detail: `${s.id}/${c.key} moved ${((c.changePct ?? 0) * 100).toFixed(1)}% year on year — flagged as an anomaly and excluded from headline claims.`,
      });
    }
  }

  if (!d.caveats.length) issues.push({ level: "block", check: "caveats", detail: "Dataset carries no caveats — every study must state its limits." });
  if (!d.queries.length) issues.push({ level: "block", check: "ledger", detail: "No query ledger — the figures would not be reproducible." });
  if (d.queries.some((q) => !Number.isFinite(q.hits))) issues.push({ level: "block", check: "ledger", detail: "Ledger contains a non-finite hit count." });

  return issues;
}

export function checkDraft(draft: PostDraft, d: Dataset): Issue[] {
  const issues: Issue[] = [];
  const body = draft.body_md;

  if (/\bNaN\b|\bundefined\b|\bInfinity\b|\[object Object\]/.test(body)) {
    issues.push({ level: "block", check: "placeholders", detail: "Body contains an unrendered value (NaN/undefined/Infinity)." });
  }
  if (/\bn\/a\b/i.test(body.split("## Methodology")[0] ?? body)) {
    issues.push({ level: "warn", check: "placeholders", detail: "Body contains 'n/a' above the methodology section." });
  }
  if (draft.meta_description.length > 155) {
    issues.push({ level: "block", check: "meta-length", detail: `Meta description is ${draft.meta_description.length} characters (max 155).` });
  }
  if (!draft.faq.length) issues.push({ level: "warn", check: "faq", detail: "No FAQ block — weakens the answer surface." });

  // Every caveat the dataset declares must actually appear in the article.
  for (const caveat of d.caveats) {
    const stem = caveat.split(".")[0].slice(0, 40);
    if (!body.includes(stem)) {
      issues.push({ level: "block", check: "caveats-surfaced", detail: `Declared caveat is missing from the article: "${stem}…"` });
    }
  }

  if (!/## <a id="methodology"><\/a>Methodology|## Methodology/.test(body)) {
    issues.push({ level: "block", check: "methodology", detail: "No methodology section." });
  }
  if (!body.includes("Open Government Licence")) {
    issues.push({ level: "block", check: "licence", detail: "No licence attribution for Companies House data." });
  }

  for (const href of linksIn(body)) {
    if (href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) continue;
    if (!href.startsWith("/")) {
      issues.push({ level: "block", check: "links", detail: `Relative link that is neither absolute nor rooted: ${href}` });
      continue;
    }
    if (!routeExists(href)) issues.push({ level: "block", check: "links", detail: `Internal link does not resolve: ${href}` });
  }
  for (const r of draft.related) {
    if (r.href.startsWith("/") && !r.href.startsWith("/blog/") && !routeExists(r.href)) {
      issues.push({ level: "block", check: "links", detail: `Related link does not resolve: ${r.href}` });
    }
  }

  return issues;
}

export function blocking(issues: Issue[]): Issue[] {
  return issues.filter((i) => i.level === "block");
}
