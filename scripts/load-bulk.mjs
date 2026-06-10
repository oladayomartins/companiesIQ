// Bulk-load the Companies House "Free Company Data Product" into the register
// cache (public.companies). This is the one-shot way to populate filing dates
// (accounts / confirmation statement) + SIC/sector for the whole UK register,
// so the filing-status filters return real volume instead of enriching live.
//
// Get the snapshot (one ~470MB zip, or 7 split zips) from:
//   https://download.companieshouse.gov.uk/en_output.html
// Unzip to a CSV, then:
//
//   node scripts/load-bulk.mjs --file BasicCompanyDataAsOneFile.csv
//   node scripts/load-bulk.mjs --file data.csv --active-only       # active companies only
//   node scripts/load-bulk.mjs --file data.csv --limit 250000      # free-tier-sized subset
//   node scripts/load-bulk.mjs --file data.csv --skip 250000       # resume
//
// FREE TIER NOTE: Supabase free is ~500MB (~250k companies). Use --active-only
// and/or --limit for a subset, or upgrade to Pro for the full ~5.5M register.
//
// Talks to Supabase via PostgREST (fetch) — no SDK. Streams the CSV (never
// loads it all into memory). Reads NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY from the environment or .env.local.
import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";

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
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}
const FILE = arg("--file");
const LIMIT = Number(arg("--limit", 0)) || Infinity;
const SKIP = Number(arg("--skip", 0)) || 0;
const ACTIVE_ONLY = args.includes("--active-only");
const BATCH = Number(arg("--batch", 1000)) || 1000;

if (!FILE) {
  console.error("✗ --file <path-to-CompaniesHouse-CSV> is required.");
  process.exit(1);
}

const REST = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/companies?on_conflict=number`;
const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
};

// SIC division (first 2 digits) → high-level sector (mirrors lib/sic SECTIONS).
const SECTIONS = [
  ["Agriculture & fishing", 1, 3], ["Mining & extraction", 5, 9], ["Manufacturing", 10, 33],
  ["Energy & utilities", 35, 35], ["Water & waste", 36, 39], ["Construction", 41, 43],
  ["Retail & wholesale", 45, 47], ["Transport & logistics", 49, 53], ["Hospitality", 55, 56],
  ["Technology", 58, 63], ["Financial services", 64, 66], ["Real estate", 68, 68],
  ["Professional services", 69, 75], ["Business support", 77, 82], ["Public administration", 84, 84],
  ["Education", 85, 85], ["Healthcare & social", 86, 88], ["Arts & recreation", 90, 93],
  ["Other services", 94, 96], ["Households & other", 97, 99],
];
function sectorFor(sic) {
  const div = parseInt(String(sic).slice(0, 2), 10);
  if (Number.isNaN(div)) return null;
  const s = SECTIONS.find((x) => div >= x[1] && div <= x[2]);
  return s ? s[0] : "Other";
}

const TODAY = new Date().toISOString().slice(0, 10);
function toIso(ddmmyyyy) {
  // CH bulk dates are DD/MM/YYYY.
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((ddmmyyyy || "").trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
function isPastDue(iso) {
  return !!iso && iso < TODAY;
}

// RFC-4180-ish line parser (handles quoted fields, escaped quotes, embedded commas).
function parseLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

async function flush(rows) {
  if (!rows.length) return;
  const res = await fetch(REST, { method: "POST", headers: sbHeaders, body: JSON.stringify(rows) });
  if (!res.ok) {
    console.warn(`  ! upsert ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

async function main() {
  console.log(`Loading ${FILE}${ACTIVE_ONLY ? " (active only)" : ""}${Number.isFinite(LIMIT) ? `, limit ${LIMIT}` : ""}${SKIP ? `, skip ${SKIP}` : ""}`);
  const rl = createInterface({ input: createReadStream(FILE, "utf8"), crlfDelay: Infinity });

  let header = null;
  let col = {};
  let seen = 0;
  let loaded = 0;
  let batch = [];

  for await (const line of rl) {
    if (!header) {
      header = parseLine(line);
      header.forEach((h, i) => (col[h] = i));
      // Sanity check a couple of expected columns.
      if (col["CompanyNumber"] == null || col["Accounts.NextDueDate"] == null) {
        console.error("✗ Unexpected CSV header — is this the CH Free Company Data file?");
        process.exit(1);
      }
      continue;
    }
    if (!line.trim()) continue;
    seen++;
    if (seen <= SKIP) continue;
    if (loaded >= LIMIT) break;

    const f = parseLine(line);
    const status = (f[col["CompanyStatus"]] || "").toLowerCase();
    if (ACTIVE_ONLY && status !== "active") continue;

    const number = f[col["CompanyNumber"]];
    if (!number) continue;

    const sics = ["SICCode.SicText_1", "SICCode.SicText_2", "SICCode.SicText_3", "SICCode.SicText_4"]
      .map((k) => (col[k] != null ? (f[col[k]] || "").match(/^\d{4,5}/)?.[0] : null))
      .filter(Boolean);
    const accNextDue = toIso(f[col["Accounts.NextDueDate"]]);
    const confNextDue = toIso(f[col["ConfStmtNextDueDate"]]);

    batch.push({
      number,
      name: f[col["CompanyName"]] || number,
      status,
      type: f[col["CompanyCategory"]] || null,
      incorporated: toIso(f[col["IncorporationDate"]]),
      dissolved: toIso(f[col["DissolutionDate"]]),
      sic_codes: sics,
      primary_sector: sics[0] ? sectorFor(sics[0]) : null,
      postcode: f[col["RegAddress.PostCode"]] || null,
      accounts_next_due: accNextDue,
      accounts_overdue: isPastDue(accNextDue),
      accounts_last_made_up: toIso(f[col["Accounts.LastMadeUpDate"]]),
      confirmation_next_due: confNextDue,
      confirmation_overdue: isPastDue(confNextDue),
      filing_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    loaded++;

    if (batch.length >= BATCH) {
      await flush(batch);
      batch = [];
      if (loaded % 50000 === 0) console.log(`  …${loaded} loaded`);
    }
  }
  await flush(batch);
  console.log(`✓ Done. ${loaded} companies loaded into the register cache.`);
}

main().catch((e) => {
  console.error("✗", e);
  process.exit(1);
});
