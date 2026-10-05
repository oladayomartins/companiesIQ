// ============================================================
// Search Console export → demand & opportunity analysis (pure).
//
// Takes the "Pages" and "Queries" CSVs from GSC → Performance → Export and
// answers the questions the revenue report couldn't (no Ahrefs access):
//   • Which pages/queries are we already visible for but not getting clicked?
//     (CTR far below what the position should earn → rewrite title/meta)
//   • Which are in striking distance of page one? (positions 8–20)
//   • How much of the demand is commercial (buyers) vs look-ups vs how-to?
// ============================================================

export interface GscRow {
  key: string; // page URL or query
  clicks: number;
  impressions: number;
  ctr: number; // 0–1
  position: number;
}

/** Minimal RFC-4180 CSV parser (quoted fields may contain commas/newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim()));
}

/** Parse a GSC Pages or Queries export. Throws on an unrecognised header. */
export function parseGscExport(text: string): { kind: "pages" | "queries"; rows: GscRow[] } {
  const [header, ...body] = parseCsv(text.replace(/^﻿/, ""));
  if (!header) throw new Error("The file is empty.");
  const h = header.map((x) => x.trim().toLowerCase());
  const kind = h[0].includes("page") ? "pages" : h[0].includes("quer") ? "queries" : null;
  const ci = h.indexOf("clicks");
  const ii = h.indexOf("impressions");
  const ri = h.indexOf("ctr");
  const pi = h.indexOf("position");
  if (!kind || ci < 0 || ii < 0 || pi < 0) {
    throw new Error("Expected a Search Console 'Pages' or 'Queries' export (Top pages/Top queries, Clicks, Impressions, CTR, Position).");
  }
  const num = (s: string | undefined) => Number(String(s ?? "").replace(/[,%\s]/g, "")) || 0;
  const rows = body
    .map((r) => {
      const clicks = num(r[ci]);
      const impressions = num(r[ii]);
      const ctr = ri >= 0 ? num(r[ri]) / 100 : impressions ? clicks / impressions : 0;
      return { key: r[0].replace(/\s+/g, " ").trim(), clicks, impressions, ctr, position: num(r[pi]) };
    })
    .filter((r) => r.key && r.impressions > 0);
  return { kind, rows };
}

/** Typical organic CTR by position (conservative, page-one curve). */
export function expectedCtr(position: number): number {
  const p = Math.max(1, Math.round(position));
  const curve = [0.28, 0.15, 0.1, 0.07, 0.05, 0.04, 0.03, 0.025, 0.02, 0.018];
  if (p <= 10) return curve[p - 1];
  if (p <= 20) return 0.01;
  return 0.003;
}

export type Intent = "brand" | "commercial" | "competitor" | "sector" | "lookup" | "informational" | "other";

const BRAND = /\b(companies ?iq|company ?iq|companyiq)\b/;
const COMPETITOR = /\b(endole|companies house alternative|alternatives? to|formation ?data|company check|vs\b)/;
const COMMERCIAL = /\b(database|leads?|lists?|data|prospect\w*|api|export|software|tool|search companies|business intelligence|sales intelligence|newly registered|new compan|monitor\w*|alerts?)\b/;
// "construction companies birmingham", "it companies manchester" — sector ×
// location browsing, served by /industry, /city and /sic pages.
const SECTOR = /\b(compan(y|ies)|firms?|business(es)?|industr(y|ies)|sectors?|contractors?|agenc(y|ies)|manufacturers?|wholesalers?|developers?|franchise|services)\b/;
const INFO = /^(what|how|why|when|who|where|is|does|can)\b|\b(meaning|explained|definition|sic code|confirmation statement|micro entity|dormant)\b/;

export function classifyQuery(q: string): Intent {
  const s = q.toLowerCase();
  if (BRAND.test(s)) return "brand";
  if (COMPETITOR.test(s)) return "competitor";
  // A specific entity: a company/bank name, number, sort code, address or domain.
  if (/\b(ltd|limited|plc|bank|companies house|head office|address)\b|\d{5,8}|\.(com|co\.uk|ie|net|io|se)\b/.test(s) && !/\bsic\b/.test(s)) return "lookup";
  if (INFO.test(s)) return "informational";
  if (COMMERCIAL.test(s)) return "commercial";
  if (SECTOR.test(s)) return "sector";
  return "other";
}

/** Group a page URL into a template ("/company/*", "/blog/*" …). */
export function pageTemplate(url: string): string {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    /* already a path */
  }
  const seg = path.split("/").filter(Boolean);
  if (!seg.length) return "/ (home)";
  if (seg.length === 1) return `/${seg[0]}`;
  return `/${seg[0]}/*`;
}

export interface Opportunity extends GscRow {
  kind: "ctr_gap" | "striking_distance";
  missedClicks: number; // extra clicks/period at the expected CTR (or at position ~5)
  action: string;
  intent?: Intent;
}

/** Pages/queries ranked by clicks we're leaving on the table. */
export function findOpportunities(rows: GscRow[], isQuery: boolean, limit = 25): Opportunity[] {
  const out: Opportunity[] = [];
  for (const r of rows) {
    const intent = isQuery ? classifyQuery(r.key) : undefined;
    if (intent === "lookup" || intent === "other") continue; // third-party look-ups don't convert
    const exp = expectedCtr(r.position);
    if (r.position <= 10 && r.impressions >= 50 && r.ctr < exp * 0.5) {
      out.push({
        ...r,
        intent,
        kind: "ctr_gap",
        missedClicks: Math.round(r.impressions * (exp - r.ctr)),
        action: isQuery ? "Ranking page-one but not clicked: match title & meta to this query" : "Rewrite title & meta description — snippet isn't earning the click",
      });
    } else if (r.position > 10 && r.position <= 20 && r.impressions >= 30) {
      out.push({
        ...r,
        intent,
        kind: "striking_distance",
        missedClicks: Math.round(r.impressions * (expectedCtr(5) - r.ctr)),
        action: isQuery ? "Page 2: strengthen the ranking page's content & internal links for this query" : "Page 2: add internal links from high-traffic pages + expand content",
      });
    }
  }
  // Commercial and competitor intent are worth more than how-to traffic.
  const weight = (o: Opportunity) => o.missedClicks * (o.intent === "commercial" || o.intent === "competitor" ? 2 : o.intent === "informational" ? 0.6 : 1);
  return out.sort((a, b) => weight(b) - weight(a)).slice(0, limit);
}

export interface Bucket {
  label: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number; // impression-weighted
  count: number;
}

export function bucketBy(rows: GscRow[], keyOf: (r: GscRow) => string): Bucket[] {
  const m = new Map<string, Bucket & { posW: number }>();
  for (const r of rows) {
    const k = keyOf(r);
    const b = m.get(k) ?? { label: k, clicks: 0, impressions: 0, ctr: 0, position: 0, count: 0, posW: 0 };
    b.clicks += r.clicks;
    b.impressions += r.impressions;
    b.posW += r.position * r.impressions;
    b.count++;
    m.set(k, b);
  }
  return [...m.values()]
    .map(({ posW, ...b }) => ({ ...b, ctr: b.impressions ? b.clicks / b.impressions : 0, position: b.impressions ? posW / b.impressions : 0 }))
    .sort((a, b) => b.impressions - a.impressions);
}
