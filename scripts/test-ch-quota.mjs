// Unit tests for lib/ch-quota.ts (the Companies House quota guard).
//
//   npm run test:quota
//
// No test framework in the repo, so this uses node:test and compiles the
// module with the TypeScript compiler already in devDependencies.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const src = readFileSync(new URL("../lib/ch-quota.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const file = join(mkdtempSync(join(tmpdir(), "ch-quota-")), "ch-quota.mjs");
writeFileSync(file, js);
const { QuotaGuard } = await import(file);

const clock = (start = 1_000_000_000_000) => {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
};
const secs = (ms) => Math.floor(ms / 1000);

test("unknown budget allows low-priority work", () => {
  const c = clock();
  const g = new QuotaGuard(250, 6, c.now);
  assert.equal(g.allowsLow(), true);
  assert.equal(g.allowsLow(36), true);
});

test("low-priority work stops at the reserve, high-priority is never gated here", () => {
  const c = clock();
  const g = new QuotaGuard(250, 6, c.now);
  const reset = secs(c.now() + 200_000);
  g.observe(400, reset);
  assert.equal(g.allowsLow(), true);
  assert.equal(g.allowsLow(150), true); // 400 - 150 = 250, exactly the reserve
  assert.equal(g.allowsLow(151), false); // would dip into the reserve
  g.observe(250, reset);
  assert.equal(g.allowsLow(), false);
});

test("within a window the lowest reading wins (instances race; budget only falls)", () => {
  const c = clock();
  const g = new QuotaGuard(250, 6, c.now);
  const reset = secs(c.now() + 200_000);
  g.observe(260, reset);
  g.observe(500, reset); // an older, cached-but-same-window reading must not raise it
  assert.equal(g.remaining(), 260);
  assert.equal(g.allowsLow(20), false);
});

test("readings for a window that already reset are ignored", () => {
  const c = clock();
  const g = new QuotaGuard(250, 6, c.now);
  g.observe(5, secs(c.now() - 1_000)); // stale: from a cached response
  assert.equal(g.remaining(), null);
  assert.equal(g.allowsLow(), true);
});

test("a 429 blocks low-priority work until the window resets", () => {
  const c = clock();
  const g = new QuotaGuard(250, 6, c.now);
  g.exhausted(secs(c.now() + 120_000));
  assert.equal(g.allowsLow(), false);
  c.advance(121_000);
  assert.equal(g.allowsLow(), true);
});

test("a 429 without a reset header blocks for a minute", () => {
  const c = clock();
  const g = new QuotaGuard(250, 6, c.now);
  g.exhausted(null);
  assert.equal(g.allowsLow(), false);
  c.advance(61_000);
  assert.equal(g.allowsLow(), true);
});

test("a new window lifts the block", () => {
  const c = clock();
  const g = new QuotaGuard(250, 6, c.now);
  g.observe(10, secs(c.now() + 30_000));
  assert.equal(g.allowsLow(), false);
  c.advance(31_000);
  g.observe(590, secs(c.now() + 300_000));
  assert.equal(g.allowsLow(), true);
});

test("low-priority concurrency is capped and slots are handed on", async () => {
  const g = new QuotaGuard(250, 2);
  const r1 = await g.acquireLow();
  const r2 = await g.acquireLow();
  let third = false;
  const p3 = g.acquireLow().then((r) => {
    third = true;
    return r;
  });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(third, false, "third request must wait while two are in flight");
  r1();
  r1(); // releasing twice must not free two slots
  const r3 = await p3;
  assert.equal(third, true);
  let fourth = false;
  const p4 = g.acquireLow().then((r) => ((fourth = true), r));
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(fourth, false, "double release must not have leaked a slot");
  r2();
  (await p4)();
  r3();
});

test("warnings are throttled to one a minute", () => {
  const c = clock();
  const g = new QuotaGuard(250, 6, c.now);
  assert.equal(g.shouldWarn(), true);
  assert.equal(g.shouldWarn(), false);
  c.advance(61_000);
  assert.equal(g.shouldWarn(), true);
});

test("a released slot goes to the waiter, never to a newcomer", async () => {
  const g = new QuotaGuard(250, 1);
  const r1 = await g.acquireLow();
  let waiterGot = false;
  const pw = g.acquireLow().then((r) => ((waiterGot = true), r));
  r1(); // hand-off to the waiter
  let newcomerGot = false;
  const pn = g.acquireLow().then((r) => ((newcomerGot = true), r));
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(waiterGot, true);
  assert.equal(newcomerGot, false, "cap of 1 must hold during the hand-off");
  (await pw)();
  (await pn)();
});

test("waitMsForLow: zero when allowed, time-to-reset (+1s) when blocked", () => {
  const c = clock();
  const g = new QuotaGuard(250, 6, c.now);
  assert.equal(g.waitMsForLow(), 0);
  g.observe(240, secs(c.now() + 90_000));
  const w = g.waitMsForLow();
  assert.ok(w >= 90_000 && w <= 91_000, `expected ~91s, got ${w}`);
  c.advance(95_000);
  assert.equal(g.waitMsForLow(), 0);
});
