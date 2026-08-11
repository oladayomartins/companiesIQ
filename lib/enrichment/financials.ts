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
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { CompanyFinancials } from "./financials-types";
import { parseIxbrlConcepts } from "./ixbrl-parse";

const CH_API = "https://api.company-information.service.gov.uk";
const SOURCE = "Companies House filed accounts (iXBRL)";
const FIN_TTL_MS = 120 * 86_400_000; // accounts are annual — long cache TTL

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
  prevPeriodEnd: null,
  prevTurnover: null,
  prevNetAssets: null,
  prevEmployees: null,
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

// ---- Cache (public.companies fin_* columns) ----
function fresh(ts?: string | null): boolean {
  if (!ts) return false;
  const t = Date.parse(ts);
  return Number.isFinite(t) && Date.now() - t < FIN_TTL_MS;
}

async function readCache(number: string): Promise<CompanyFinancials | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from("companies")
    .select(
      "fin_turnover,fin_net_assets,fin_cash,fin_employees,fin_accounts_type,fin_period_end,fin_checked_at,fin_prev_turnover,fin_prev_net_assets,fin_prev_employees,fin_prev_period_end",
    )
    .eq("number", number)
    .maybeSingle();
  if (!data || !fresh(data.fin_checked_at as string)) return null;
  const turnover = (data.fin_turnover as number) ?? null;
  const netAssets = (data.fin_net_assets as number) ?? null;
  const cash = (data.fin_cash as number) ?? null;
  const employees = (data.fin_employees as number) ?? null;
  const accountsType = (data.fin_accounts_type as string) ?? null;
  const assessed = accountsType === "dormant" || turnover != null || netAssets != null || cash != null || employees != null;
  return {
    companyNumber: number,
    assessed,
    accountsType,
    periodEnd: (data.fin_period_end as string) ?? null,
    filedOn: null,
    turnover,
    netAssets,
    cash,
    employees,
    prevPeriodEnd: (data.fin_prev_period_end as string) ?? null,
    prevTurnover: (data.fin_prev_turnover as number) ?? null,
    prevNetAssets: (data.fin_prev_net_assets as number) ?? null,
    prevEmployees: (data.fin_prev_employees as number) ?? null,
    source: SOURCE,
    checkedAt: data.fin_checked_at as string,
  };
}

async function writeCache(number: string, f: CompanyFinancials, name?: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const row = {
    fin_turnover: f.turnover,
    fin_net_assets: f.netAssets,
    fin_cash: f.cash,
    fin_employees: f.employees,
    fin_accounts_type: f.accountsType,
    fin_period_end: f.periodEnd,
    fin_prev_turnover: f.prevTurnover,
    fin_prev_net_assets: f.prevNetAssets,
    fin_prev_employees: f.prevEmployees,
    fin_prev_period_end: f.prevPeriodEnd,
    fin_checked_at: new Date().toISOString(),
  };
  try {
    // With a name we can create the cache row; otherwise update an existing one
    // (companies.name is NOT NULL, so a blind upsert without it would fail).
    if (name) await admin.from("companies").upsert({ number, name, ...row }, { onConflict: "number" });
    else await admin.from("companies").update(row).eq("number", number);
  } catch {
    /* best-effort — never block a render */
  }
}

/**
 * Cache-first financials. Returns the cached row when fresh (zero CH calls);
 * otherwise fetches + parses the latest accounts and writes the cache. Pass
 * `name` so a not-yet-cached company can be inserted (callers usually have it).
 */
export async function getCompanyFinancials(number: string, opts: { name?: string } = {}): Promise<CompanyFinancials> {
  const cached = await readCache(number);
  if (cached) return cached;
  const live = await fetchLiveFinancials(number);
  await writeCache(number, live, opts.name);
  return live;
}

/**
 * Cron-driven backfill: check a bounded batch of cached companies that are old
 * enough to have filed first accounts (~15 months) and haven't been checked.
 * Reuses the cache-first fetch (so each company caches itself). Bounded per run
 * to stay within the Companies House rate limit alongside the ingest job.
 */
export async function backfillFinancialsBatch(limit = 60): Promise<{ checked: number; withFigures: number }> {
  const admin = getSupabaseAdmin();
  if (!admin || !isFinancialsConfigured()) return { checked: 0, withFigures: 0 };
  const cutoff = new Date(Date.now() - 456 * 86_400_000).toISOString().slice(0, 10); // ~15 months
  const { data } = await admin
    .from("companies")
    .select("number,name")
    .is("fin_checked_at", null)
    .lt("incorporated", cutoff)
    .order("incorporated", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as { number: string; name: string }[];

  let checked = 0;
  let withFigures = 0;
  let i = 0;
  const worker = async () => {
    while (i < rows.length) {
      const row = rows[i++];
      try {
        const f = await getCompanyFinancials(row.number, { name: row.name });
        checked++;
        if (f.netAssets != null || f.turnover != null) withFigures++;
      } catch {
        /* skip this one */
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, rows.length) }, worker));
  return { checked, withFigures };
}

/**
 * Latest financials for a company, parsed from its most recent accounts filing.
 * Returns an all-null "Not Assessed" result if no accounts, no iXBRL, or a parse
 * miss — never a fabricated figure.
 */
async function fetchLiveFinancials(number: string): Promise<CompanyFinancials> {
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
    prevPeriodEnd: parsed.prevPeriodEnd,
    prevTurnover: parsed.prevTurnover,
    prevNetAssets: parsed.prevNetAssets,
    prevEmployees: parsed.prevEmployees,
  };
}
