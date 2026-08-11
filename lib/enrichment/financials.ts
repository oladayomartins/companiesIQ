// ============================================================
// Company financials from filed accounts (iXBRL) — Phase 1
// ------------------------------------------------------------
// Fetches a company's latest accounts filing from Companies House, downloads
// the iXBRL (XHTML) document, and parses a curated set of financial concepts.
// Free (Open Government Licence). Part of the fenced ENRICHMENT layer — same
// ethos as lib/enrichment/places.ts: a measured, sourced value, or null =
// "Not Assessed". Never fabricated. See docs/financials-ixbrl.md.
//
// Phase 1 is a proof: on-demand fetch + parse for one company (no cache, no
// filters). The regex-based iXBRL reader is deliberately targeted at flat
// ix:nonFraction facts + context period dates; Phase 2 can harden it.
import "server-only";
import type { CompanyFinancials } from "./financials-types";
import { parseIxbrlConcepts } from "./ixbrl-parse";

const CH_API = "https://api.company-information.service.gov.uk";
const SOURCE = "Companies House filed accounts (iXBRL)";

export function isFinancialsConfigured(): boolean {
  return !!process.env.COMPANIES_HOUSE_API_KEY;
}

function authHeader(): string {
  const key = process.env.COMPANIES_HOUSE_API_KEY || "";
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

interface FilingItem {
  date?: string;
  type?: string;
  category?: string;
  description?: string;
  action_date?: string;
  description_values?: { made_up_date?: string };
  links?: { document_metadata?: string };
}

// Human accounts-type from the CH filing description code.
function accountsTypeOf(description?: string): string | null {
  if (!description) return null;
  const d = description.toLowerCase();
  if (d.includes("micro")) return "micro-entity";
  if (d.includes("dormant")) return "dormant";
  if (d.includes("small")) return "small";
  if (d.includes("full")) return "full";
  if (d.includes("total-exemption")) return "total-exemption";
  if (d.includes("group")) return "group";
  return "accounts";
}

const notAssessed = (n: string): CompanyFinancials => ({
  companyNumber: n,
  assessed: false,
  accountsType: null,
  periodEnd: null,
  filedOn: null,
  turnover: null,
  netAssets: null,
  cash: null,
  employees: null,
  source: SOURCE,
  checkedAt: new Date().toISOString(),
});

// ---- Fetch orchestration ----
async function chJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Authorization: authHeader(), Accept: "application/json" }, signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Latest financials for a company, parsed from its most recent accounts filing.
 * Returns an all-null "Not Assessed" result if no accounts, no iXBRL, or a parse
 * miss — never a fabricated figure.
 */
export async function getCompanyFinancials(number: string): Promise<CompanyFinancials> {
  if (!isFinancialsConfigured()) return notAssessed(number);

  // 1. Latest accounts filing.
  const filings = await chJson<{ items?: FilingItem[] }>(
    `${CH_API}/company/${encodeURIComponent(number)}/filing-history?category=accounts&items_per_page=10`,
  );
  const acc = (filings?.items || []).find((f) => (f.category === "accounts" || (f.type || "").startsWith("AA")) && f.links?.document_metadata);
  if (!acc?.links?.document_metadata) return notAssessed(number);

  const base: CompanyFinancials = {
    ...notAssessed(number),
    accountsType: accountsTypeOf(acc.description),
    filedOn: acc.date ?? null,
    periodEnd: acc.description_values?.made_up_date ?? null,
  };
  if (base.accountsType === "dormant") return { ...base, assessed: true }; // dormant → no figures, but assessed

  // 2. Document metadata → content link + available formats.
  const meta = await chJson<{ links?: { document?: string }; resources?: Record<string, unknown> }>(acc.links.document_metadata);
  const contentUrl = meta?.links?.document || `${acc.links.document_metadata}/content`;
  const hasXhtml = !meta?.resources || Object.keys(meta.resources).some((k) => k.includes("xhtml") || k.includes("xml"));
  if (!hasXhtml) return base; // PDF-only / not machine-readable

  // 3. Fetch the iXBRL document and parse.
  let xhtml = "";
  try {
    const res = await fetch(contentUrl, { headers: { Authorization: authHeader(), Accept: "application/xhtml+xml" }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return base;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("pdf")) return base;
    xhtml = await res.text();
  } catch {
    return base;
  }
  if (!/<ix:nonfraction/i.test(xhtml)) return base; // not iXBRL

  const parsed = parseIxbrlConcepts(xhtml);
  return {
    ...base,
    assessed: true,
    periodEnd: parsed.periodEnd || base.periodEnd,
    turnover: parsed.turnover,
    netAssets: parsed.netAssets,
    cash: parsed.cash,
    employees: parsed.employees,
  };
}
