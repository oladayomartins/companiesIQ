// Backfill filing-status data into the CompaniesIQ register cache.
//
// For each row in public.companies that has no filing data yet (or with --all,
// every row), fetch its Companies House profile and store the accounts and
// confirmation-statement dates + overdue flags. These power the accountant
// filters (overdue accounts, accounts due soon, confirmation statement due).
//
// Companies House search can't filter on filing status, so this cache is the
// only way to answer those queries. Run it once to seed, then on a schedule
// (e.g. nightly) to keep it fresh. Respects CH rate limits (600 req / 5 min).
//
// Usage:
//   node scripts/backfill-filing.mjs                 # up to 2000 un-checked rows
//   node scripts/backfill-filing.mjs --limit 10000   # more in one pass
//   node scripts/backfill-filing.mjs --all           # re-check every row
//   node scripts/backfill-filing.mjs --stale 30      # re-check rows older than 30 days
//
// Talks to Supabase via its REST (PostgREST) API with fetch — no SDK, so it
// runs on any Node without the realtime/WebSocket dependency. Reads
// NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
// COMPANIES_HOUSE_API_KEY from the environment or .env.local.
import { readFileSync } from "node:fs";

function env(name) {
  if (process.env[name]) return process.env[name];
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
// The batch key keeps a long backfill from spending the live site's rate limit.
const CH_KEY = env("COMPANIES_HOUSE_BATCH_API_KEY") || env("COMPANIES_HOUSE_API_KEY");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}
if (!CH_KEY) {
  console.error("✗ COMPANIES_HOUSE_API_KEY is required.");
  process.exit(1);
}

const args = process.argv.slice(2);
const LIMIT = Number(args[args.indexOf("--limit") + 1]) || 2000;
const ALL = args.includes("--all");
const STALE_DAYS = args.includes("--stale") ? Number(args[args.indexOf("--stale") + 1]) || 30 : null;
const CONCURRENCY = 5; // stays well under 600 req / 5 min
const PAGE = 500;

const REST = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/companies`;
const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};
const chAuth = "Basic " + Buffer.from(`${CH_KEY}:`).toString("base64");

function isPastDue(due) {
  if (!due) return false;
  const t = Date.parse(due);
  return Number.isFinite(t) && t < Date.now();
}

function selectFilter() {
  if (ALL) return "";
  if (STALE_DAYS) {
    const cutoff = new Date(Date.now() - STALE_DAYS * 86400000).toISOString();
    return `&or=(filing_checked_at.is.null,filing_checked_at.lt.${cutoff})`;
  }
  return "&filing_checked_at=is.null";
}

async function selectBatch() {
  const url = `${REST}?select=number&order=number.asc&limit=${PAGE}${selectFilter()}`;
  const res = await fetch(url, { headers: sbHeaders });
  if (!res.ok) throw new Error(`select ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// On the live site's key (no COMPANIES_HOUSE_BATCH_API_KEY), never dip into the
// reserve its company pages need: every response reports the key's remaining
// 5-minute budget, so pause until the window resets once it's down to the
// reserve. Same rule as lib/ch-quota.ts (inlined: this script is plain JS).
const SHARED_KEY = !env("COMPANIES_HOUSE_BATCH_API_KEY");
const SITE_RESERVE = Number(env("CH_LOW_RESERVE")) || 250;
let budget = null; // { remain, resetAt } for the current window
async function respectSiteReserve() {
  if (!SHARED_KEY || !budget) return;
  const now = Date.now();
  if (budget.resetAt <= now || budget.remain - 1 >= SITE_RESERVE) return;
  const wait = budget.resetAt - now + 1000;
  console.log(`  ⏸ pausing ${Math.round(wait / 1000)}s — the shared Companies House key is down to the live site's reserve`);
  await new Promise((r) => setTimeout(r, wait));
  budget = null;
}
function noteBudget(res) {
  if (!SHARED_KEY) return;
  const reset = Number(res.headers.get("x-ratelimit-reset"));
  if (!Number.isFinite(reset)) return;
  const remain = res.status === 429 ? 0 : Number(res.headers.get("x-ratelimit-remain"));
  if (Number.isFinite(remain)) budget = { remain, resetAt: reset * 1000 };
}

async function fetchFiling(number) {
  await respectSiteReserve();
  const res = await fetch(`https://api.company-information.service.gov.uk/company/${encodeURIComponent(number)}`, {
    headers: { Authorization: chAuth },
  });
  noteBudget(res);
  if (res.status === 429) return { retry: true };
  if (res.status === 404) return { gone: true };
  if (!res.ok) throw new Error(`CH ${res.status}`);
  const p = await res.json();
  const acc = p.accounts || {};
  const cs = p.confirmation_statement || {};
  const accNextDue = acc.next_accounts?.due_on ?? acc.next_due ?? null;
  return {
    accounts_next_due: accNextDue,
    accounts_overdue: acc.next_accounts?.overdue ?? acc.overdue ?? isPastDue(accNextDue),
    accounts_last_made_up: acc.last_accounts?.made_up_to ?? null,
    confirmation_next_due: cs.next_due ?? null,
    confirmation_overdue: cs.overdue ?? isPastDue(cs.next_due),
    filing_checked_at: new Date().toISOString(),
  };
}

async function updateRow(number, filing) {
  const res = await fetch(`${REST}?number=eq.${encodeURIComponent(number)}`, {
    method: "PATCH",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify(filing),
  });
  return res.ok;
}

async function main() {
  console.log(`Backfilling filing data — limit ${LIMIT}, ${ALL ? "ALL rows" : STALE_DAYS ? `stale > ${STALE_DAYS}d` : "un-checked only"}`);
  let processed = 0;
  let updated = 0;

  while (processed < LIMIT) {
    const data = await selectBatch();
    if (!data || data.length === 0) break;

    let i = 0;
    async function worker() {
      while (i < data.length && processed < LIMIT) {
        const idx = i++;
        const number = data[idx].number;
        processed++;
        try {
          const filing = await fetchFiling(number);
          if (filing.retry) {
            await new Promise((r) => setTimeout(r, 5000));
            i = idx; // retry this index
            processed--;
            continue;
          }
          if (filing.gone) continue;
          if (await updateRow(number, filing)) updated++;
        } catch (e) {
          console.warn(`  ! ${number}: ${e.message}`);
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    console.log(`  …${processed} processed, ${updated} updated`);

    // Un-checked mode: updated rows leave the filter, so the next page is fresh.
    // ALL/stale mode without a moving cursor would loop — stop after one page set.
    if ((ALL || STALE_DAYS) && data.length < PAGE) break;
    if (data.length < PAGE) break;
  }

  console.log(`✓ Done. ${updated}/${processed} rows updated with filing data.`);
}

main().catch((e) => {
  console.error("✗", e);
  process.exit(1);
});
