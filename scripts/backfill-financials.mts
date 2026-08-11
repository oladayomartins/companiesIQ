// Backfill company financials (iXBRL) into the register cache.
//
// For companies in public.companies that haven't been checked (or --stale),
// fetch their latest accounts, parse the iXBRL, and write the fin_* columns.
// Prioritise recent formations by running after the register ingest. Powers the
// size/health search filters over the cached subset (see docs/financials-ixbrl.md).
//
// Reuses the SAME pure parser as the app (lib/enrichment/ixbrl-parse.ts), so run
// it with tsx (imports .ts):
//   npx tsx scripts/backfill-financials.mts                 # up to 500 unchecked rows
//   npx tsx scripts/backfill-financials.mts --limit 5000    # more in one pass
//   npx tsx scripts/backfill-financials.mts --stale 180     # re-check rows older than N days
//
// Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
// COMPANIES_HOUSE_API_KEY from the environment or .env.local. Respects CH's
// 600-req/5-min limit (concurrency 4).
import { readFileSync } from "node:fs";
import { parseIxbrlConcepts } from "../lib/enrichment/ixbrl-parse.ts";

function env(name: string): string | null {
  if (process.env[name]) return process.env[name] as string;
  try {
    const file = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const line = file.split("\n").find((l) => l.startsWith(name + "="));
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    /* no .env.local */
  }
  return null;
}

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const CH_KEY = env("COMPANIES_HOUSE_API_KEY");
if (!SUPABASE_URL || !SERVICE_KEY || !CH_KEY) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and COMPANIES_HOUSE_API_KEY are required.");
  process.exit(1);
}

const args = process.argv.slice(2);
const LIMIT = Number(args[args.indexOf("--limit") + 1]) || 500;
const STALE_DAYS = args.includes("--stale") ? Number(args[args.indexOf("--stale") + 1]) || 180 : null;
const CONCURRENCY = 4;
const PAGE = 200;

const REST = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/companies`;
const sbHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
const CH = "https://api.company-information.service.gov.uk";
const chAuth = "Basic " + Buffer.from(`${CH_KEY}:`).toString("base64");

// Only companies old enough to have filed first accounts (~15 months post-
// incorporation) — newer ones have nothing to parse, so skip them.
const ELIGIBLE = `&incorporated=lt.${new Date(Date.now() - 456 * 86_400_000).toISOString().slice(0, 10)}`;

function selectFilter(): string {
  if (STALE_DAYS) {
    const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();
    return `&or=(fin_checked_at.is.null,fin_checked_at.lt.${cutoff})${ELIGIBLE}`;
  }
  return `&fin_checked_at=is.null${ELIGIBLE}`;
}

async function selectBatch(): Promise<{ number: string }[]> {
  const url = `${REST}?select=number&order=incorporated.desc.nullslast&limit=${PAGE}${selectFilter()}`;
  const res = await fetch(url, { headers: sbHeaders });
  if (!res.ok) throw new Error(`select ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function chJson(url: string): Promise<any | null> {
  const res = await fetch(url, { headers: { Authorization: chAuth, Accept: "application/json" } });
  if (res.status === 429) return { __retry: true };
  if (!res.ok) return null;
  return res.json();
}

function accountsTypeOf(d?: string): string | null {
  if (!d) return null;
  const s = d.toLowerCase();
  if (s.includes("micro")) return "micro-entity";
  if (s.includes("dormant")) return "dormant";
  if (s.includes("small")) return "small";
  if (s.includes("full")) return "full";
  if (s.includes("group")) return "group";
  return "accounts";
}

interface FinRow {
  fin_turnover: number | null;
  fin_net_assets: number | null;
  fin_cash: number | null;
  fin_employees: number | null;
  fin_accounts_type: string | null;
  fin_period_end: string | null;
  fin_checked_at: string;
}

async function computeFinancials(number: string): Promise<FinRow | "retry"> {
  const nowIso = new Date().toISOString();
  const empty: FinRow = { fin_turnover: null, fin_net_assets: null, fin_cash: null, fin_employees: null, fin_accounts_type: null, fin_period_end: null, fin_checked_at: nowIso };
  const fh = await chJson(`${CH}/company/${encodeURIComponent(number)}/filing-history?category=accounts&items_per_page=10`);
  if (fh?.__retry) return "retry";
  const acc = (fh?.items || []).find((f: any) => (f.category === "accounts" || (f.type || "").startsWith("AA")) && f.links?.document_metadata);
  if (!acc?.links?.document_metadata) return empty;
  const accountsType = accountsTypeOf(acc.description);
  const row: FinRow = { ...empty, fin_accounts_type: accountsType, fin_period_end: acc.description_values?.made_up_date ?? null };
  if (accountsType === "dormant") return row;

  const meta = await chJson(acc.links.document_metadata);
  if (meta?.__retry) return "retry";
  const contentUrl = meta?.links?.document || `${acc.links.document_metadata}/content`;
  const hasXhtml = !meta?.resources || Object.keys(meta.resources).some((k: string) => k.includes("xhtml") || k.includes("xml"));
  if (!hasXhtml) return row;

  const res = await fetch(contentUrl, { headers: { Authorization: chAuth, Accept: "application/xhtml+xml" } });
  if (res.status === 429) return "retry";
  if (!res.ok) return row;
  if ((res.headers.get("content-type") || "").includes("pdf")) return row;
  const xhtml = await res.text();
  if (!/<ix:nonfraction/i.test(xhtml)) return row;
  const p = parseIxbrlConcepts(xhtml);
  return { ...row, fin_turnover: p.turnover, fin_net_assets: p.netAssets, fin_cash: p.cash, fin_employees: p.employees, fin_period_end: p.periodEnd || row.fin_period_end };
}

async function patch(number: string, row: FinRow): Promise<boolean> {
  const res = await fetch(`${REST}?number=eq.${encodeURIComponent(number)}`, { method: "PATCH", headers: { ...sbHeaders, Prefer: "return=minimal" }, body: JSON.stringify(row) });
  return res.ok;
}

async function main() {
  console.log(`Backfilling financials — limit ${LIMIT}, ${STALE_DAYS ? `stale > ${STALE_DAYS}d` : "unchecked only"}`);
  let processed = 0;
  let withFigures = 0;

  while (processed < LIMIT) {
    const batch = await selectBatch();
    if (!batch.length) break;
    let i = 0;
    async function worker() {
      while (i < batch.length && processed < LIMIT) {
        const idx = i++;
        const number = batch[idx].number;
        processed++;
        try {
          let r = await computeFinancials(number);
          if (r === "retry") {
            await new Promise((res) => setTimeout(res, 5000));
            const again = await computeFinancials(number);
            if (again === "retry") continue;
            r = again;
          }
          if (await patch(number, r)) {
            if (r.fin_net_assets != null || r.fin_turnover != null) withFigures++;
          }
        } catch (e) {
          console.warn(`  ! ${number}: ${(e as Error).message}`);
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    console.log(`  …${processed} processed, ${withFigures} with figures`);
    if (batch.length < PAGE) break;
  }
  console.log(`✓ Done. ${processed} checked, ${withFigures} had parseable figures.`);
}

main().catch((e) => {
  console.error("✗", e);
  process.exit(1);
});
