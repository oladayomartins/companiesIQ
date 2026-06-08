// One-shot setup for CompaniesIQ subscription prices.
//
// Creates (idempotently) the Analyst + Team products and their monthly/annual
// GBP recurring prices, then prints the STRIPE_PRICE_* env lines to paste into
// Vercel (and .env.local). Re-running reuses existing products/prices, so it's
// safe to run again — and to run once in TEST mode, then once in LIVE.
//
// Usage (the key decides test vs live by its sk_test_/sk_live_ prefix):
//   STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-stripe-prices.mjs
//   STRIPE_SECRET_KEY=sk_live_xxx node scripts/setup-stripe-prices.mjs
// If STRIPE_SECRET_KEY isn't in the environment, it's read from .env.local.
import Stripe from "stripe";
import { readFileSync } from "node:fs";

function loadKey() {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY;
  try {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const line = env.split("\n").find((l) => l.startsWith("STRIPE_SECRET_KEY="));
    if (line) return line.slice("STRIPE_SECRET_KEY=".length).trim();
  } catch {
    /* no .env.local */
  }
  return null;
}

const key = loadKey();
if (!key) {
  console.error("✗ STRIPE_SECRET_KEY not set (env or .env.local). Aborting.");
  process.exit(1);
}

const stripe = new Stripe(key);
const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";

// Amounts in pence (GBP minor units). Annual = the per-user annual rate × 12.
const PLANS = [
  { envKey: "ANALYST", name: "CompaniesIQ Analyst", monthly: 3900, annual: 37200 },
  { envKey: "TEAM", name: "CompaniesIQ Team", monthly: 12900, annual: 123600 },
];

async function findProductByName(name) {
  // Page through active products and match on exact name (avoids duplicates on re-run).
  for await (const p of stripe.products.list({ active: true, limit: 100 })) {
    if (p.name === name) return p;
  }
  return null;
}

async function findPrice(productId, unit, interval) {
  for await (const pr of stripe.prices.list({ product: productId, active: true, limit: 100 })) {
    if (pr.currency === "gbp" && pr.unit_amount === unit && pr.recurring?.interval === interval) return pr;
  }
  return null;
}

async function ensurePrice(productId, unit, interval) {
  const existing = await findPrice(productId, unit, interval);
  if (existing) return existing;
  return stripe.prices.create({
    product: productId,
    currency: "gbp",
    unit_amount: unit,
    recurring: { interval },
  });
}

console.log(`\nSetting up CompaniesIQ subscription prices in ${mode} mode…\n`);
const out = {};
for (const plan of PLANS) {
  let product = await findProductByName(plan.name);
  if (!product) product = await stripe.products.create({ name: plan.name });
  const monthly = await ensurePrice(product.id, plan.monthly, "month");
  const annual = await ensurePrice(product.id, plan.annual, "year");
  out[`STRIPE_PRICE_${plan.envKey}_MONTHLY`] = monthly.id;
  out[`STRIPE_PRICE_${plan.envKey}_ANNUAL`] = annual.id;
  console.log(`✓ ${plan.name}  (${product.id})`);
}

console.log(`\n--- Paste into Vercel env (Production) and .env.local [${mode}] ---`);
for (const [k, v] of Object.entries(out)) console.log(`${k}=${v}`);
console.log("");
