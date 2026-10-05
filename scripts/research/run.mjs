// CLI for the research pipeline.
//
// The pipeline itself lives in lib/research (TypeScript, server-side) so the
// scheduled run and a manual run execute exactly the same code — there is no
// second implementation to drift. This script just drives the endpoint.
//
//   node scripts/research/run.mjs --dry                      # collect + validate, publish nothing
//   node scripts/research/run.mjs --study sic-formations     # run one study
//   node scripts/research/run.mjs --force                    # ignore the refresh window
//   node scripts/research/run.mjs --base https://www.companiesiq.co.uk
//
// Against a local dev server no secret is needed. Against production, set
// INGEST_SECRET (or CRON_SECRET) in the environment to match the deployment.
import { readFileSync } from "node:fs";

function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const file = readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
    const line = file.split("\n").find((l) => l.startsWith(name + "="));
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    /* no .env.local */
  }
  return null;
}

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const BASE = (arg("--base", "http://localhost:3000") || "").replace(/\/$/, "");
const secret = env("INGEST_SECRET") || env("CRON_SECRET") || "";

const qs = new URLSearchParams();
if (args.includes("--dry")) qs.set("dry", "1");
if (args.includes("--force")) qs.set("force", "1");
const study = arg("--study");
if (study) qs.set("study", study);

const url = `${BASE}/api/cron/research${qs.toString() ? `?${qs}` : ""}`;
console.log(`→ ${url}`);

const res = await fetch(url, { headers: secret ? { Authorization: `Bearer ${secret}` } : {} });
const body = await res.json().catch(() => ({ error: "non-JSON response" }));

if (!res.ok) {
  console.error(`✗ ${res.status}:`, body.error ?? body);
  if (res.status === 401 || res.status === 503) {
    console.error("  Set INGEST_SECRET in .env.local (and in the deployment) to authorise a remote run.");
  }
  process.exit(1);
}

for (const r of body.results ?? []) {
  const mark = r.status === "published" ? "✓" : r.status === "skipped" ? "·" : "!";
  console.log(`${mark} ${r.study} ${r.period ?? ""} → ${r.status}${r.reason ? ` (${r.reason})` : ""}`);
  if (r.error) console.log(`    error: ${r.error}`);
  for (const issue of r.issues ?? []) console.log(`    [${issue.level}] ${issue.check}: ${issue.detail}`);
  if (r.apiCalls) console.log(`    ${r.apiCalls} register queries in ${(r.durationMs / 1000).toFixed(1)}s`);
}
console.log(body.ok ? "\nAll editions published." : `\n${body.held} edition(s) held as drafts — see the issues above.`);
