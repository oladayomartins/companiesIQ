#!/usr/bin/env node
/**
 * CompaniesIQ — always-on ingestion worker
 * ------------------------------------------------------------
 * A long-running process that drives the collection engine on a
 * fixed cadence (default every 5 minutes), as an alternative to the
 * Vercel cron. It calls the app's own /api/ingest endpoint, which
 * pulls newly incorporated companies from Companies House, classifies
 * them via the SIC + geographic engines, and upserts them into the
 * internal register (Supabase). All the logic lives in the app — this
 * worker is just a heartbeat, so there's zero duplication.
 *
 *   APP_URL=https://app.companiesiq.co.uk \
 *   INGEST_SECRET=... \
 *   WORKER_INTERVAL_MS=300000 \
 *   npm run worker
 *
 * Designed for any always-on runtime (a VM, a container, Railway,
 * Fly.io, a systemd unit). Logs each run; never crashes on a single
 * failed cycle.
 */

const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const SECRET = process.env.INGEST_SECRET || "";
const INTERVAL = Number(process.env.WORKER_INTERVAL_MS || 5 * 60 * 1000);
const RUN_ALERTS = process.env.WORKER_RUN_ALERTS !== "false";

let running = true;
let cycle = 0;

function ts() {
  return new Date().toISOString();
}

async function hit(path) {
  const headers = SECRET ? { Authorization: `Bearer ${SECRET}` } : {};
  const started = Date.now();
  try {
    const res = await fetch(`${APP_URL}${path}`, { headers });
    const body = await res.json().catch(() => ({}));
    const ms = Date.now() - started;
    if (!res.ok) {
      console.error(`[${ts()}] ${path} → ${res.status} (${ms}ms)`, body);
      return;
    }
    console.log(`[${ts()}] ${path} → ${res.status} (${ms}ms)`, JSON.stringify(body));
  } catch (e) {
    console.error(`[${ts()}] ${path} failed:`, e?.message || e);
  }
}

async function runCycle() {
  cycle += 1;
  console.log(`[${ts()}] --- cycle ${cycle} ---`);
  await hit("/api/ingest");
  if (RUN_ALERTS) await hit("/api/alerts/run");
}

async function loop() {
  while (running) {
    await runCycle();
    if (!running) break;
    await new Promise((r) => setTimeout(r, INTERVAL));
  }
}

function shutdown(sig) {
  console.log(`[${ts()}] received ${sig}, draining…`);
  running = false;
  // give an in-flight cycle a moment, then exit
  setTimeout(() => process.exit(0), 1500);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

console.log(`[${ts()}] CompaniesIQ ingestion worker starting`);
console.log(`[${ts()}] target=${APP_URL} interval=${INTERVAL}ms alerts=${RUN_ALERTS} auth=${SECRET ? "on" : "off"}`);
loop();
