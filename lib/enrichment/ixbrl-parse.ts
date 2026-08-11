// Pure iXBRL parsing — no server deps, so it can be unit-tested directly.
// Targets flat ix:nonFraction facts + context period-end dates and extracts a
// curated set of financial concepts at the latest reporting period. Robust to
// missing tags (returns null). Hardening (a real XML parser, more concepts) is
// Phase 2 — see docs/financials-ixbrl.md.

export interface ParsedFinancials {
  periodEnd: string | null;
  turnover: number | null;
  netAssets: number | null;
  cash: number | null;
  employees: number | null;
}

interface Fact {
  name: string; // local concept name, lowercased
  value: number;
  end: string | null; // period-end date from the referenced context
}

// contextRef -> period-end (or instant) date
function parseContexts(xhtml: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of xhtml.matchAll(/<(?:xbrli:)?context\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/(?:xbrli:)?context>/gi)) {
    const end = m[2].match(/<(?:xbrli:)?(?:endDate|instant)>\s*(\d{4}-\d{2}-\d{2})\s*</i);
    if (end) out[m[1]] = end[1];
  }
  return out;
}

function parseFacts(xhtml: string, contexts: Record<string, string>): Fact[] {
  const facts: Fact[] = [];
  for (const m of xhtml.matchAll(/<ix:nonfraction\b([^>]*)>([\s\S]*?)<\/ix:nonfraction>/gi)) {
    const attrs = m[1];
    const name = (attrs.match(/\bname="([^"]+)"/i)?.[1] || "").split(":").pop()?.toLowerCase();
    if (!name) continue;
    const ctx = attrs.match(/\bcontextref="([^"]+)"/i)?.[1] || "";
    const scale = parseInt(attrs.match(/\bscale="(-?\d+)"/i)?.[1] || "0", 10);
    const sign = attrs.match(/\bsign="([^"]+)"/i)?.[1] === "-" ? -1 : 1;
    const digits = m[2].replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, "").replace(/[^\d.]/g, "");
    if (!digits || digits === ".") continue;
    const value = Math.round(parseFloat(digits) * Math.pow(10, scale) * sign);
    if (!Number.isFinite(value)) continue;
    facts.push({ name, value, end: contexts[ctx] ?? null });
  }
  return facts;
}

// Concept -> candidate local names (UK GAAP / FRS taxonomies), priority order.
const CONCEPTS = {
  turnover: ["turnoverrevenue", "turnover", "revenue"],
  netAssets: ["netassetsliabilities", "netassetsliabilitiesincludingpensionassetliability"],
  cash: ["cashbankonhand", "cashbankinhand", "cashcashequivalents"],
  employees: ["averagenumberemployeesduringperiod", "averagenumberemployees"],
} as const;

function pick(facts: Fact[], names: readonly string[], latestEnd: string | null): number | null {
  const matches = facts.filter((f) => names.includes(f.name));
  if (!matches.length) return null;
  matches.sort((a, b) => (b.end || "").localeCompare(a.end || ""));
  if (latestEnd) {
    const atLatest = matches.find((f) => f.end === latestEnd);
    if (atLatest) return atLatest.value;
  }
  return matches[0].value;
}

/** Extract curated financial concepts from an iXBRL (XHTML) document string. */
export function parseIxbrlConcepts(xhtml: string): ParsedFinancials {
  const contexts = parseContexts(xhtml);
  const facts = parseFacts(xhtml, contexts);
  const latestEnd = Object.values(contexts).sort((a, b) => b.localeCompare(a))[0] ?? null;
  return {
    periodEnd: latestEnd,
    turnover: pick(facts, CONCEPTS.turnover, latestEnd),
    netAssets: pick(facts, CONCEPTS.netAssets, latestEnd),
    cash: pick(facts, CONCEPTS.cash, latestEnd),
    employees: pick(facts, CONCEPTS.employees, latestEnd),
  };
}
