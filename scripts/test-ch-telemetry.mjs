// Unit tests for lib/ch-telemetry.ts.   npm run test:quota (runs both files)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const src = readFileSync(new URL("../lib/ch-telemetry.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const file = join(mkdtempSync(join(tmpdir(), "ch-tel-")), "ch-telemetry.mjs");
writeFileSync(file, js);
const { Telemetry, endpointShape, callerFromStack, BURST } = await import(file);

const rec = (o = {}) => ({ caller: "app/company/[number]/page", endpoint: "/company/{n}", priority: "high", outcome: "ok", remain: 400, ...o });
const setup = () => {
  let t = 0;
  const lines = [];
  const tel = new Telemetry({ phase: "runtime" }, (l) => lines.push(JSON.parse(l.replace("[ch-telemetry] ", ""))), () => t);
  return { tel, lines, advance: (ms) => (t += ms) };
};

test("endpointShape masks identifiers and drops query strings", () => {
  assert.equal(endpointShape("/company/12345678/officers?items_per_page=50"), "/company/{n}/officers");
  assert.equal(endpointShape("/company/SC123456"), "/company/{n}");
  assert.equal(endpointShape("/advanced-search/companies?sic_codes=62012"), "/advanced-search/companies");
  assert.equal(endpointShape("/officers/abc123/appointments"), "/officers/{id}/appointments");
});

test("callerFromStack finds the route in compiled and source paths", () => {
  const compiled = `Error\n    at chFetch (/var/task/.next/server/chunks/123.js:1:2)\n    at x (/var/task/.next/server/app/company/[number]/page.js:3:4)`;
  assert.equal(callerFromStack(compiled), "app/company/[number]/page");
  const route = `Error\n    at a (/var/task/.next/server/app/api/market-summary/route.js:1:1)`;
  assert.equal(callerFromStack(route), "app/api/market-summary/route");
  const lib = `Error\n    at chFetch (/repo/lib/companies-house.ts:9:9)\n    at compute (/repo/lib/sector-trend.ts:80:1)`;
  assert.equal(callerFromStack(lib), "lib/sector-trend");
  assert.equal(callerFromStack(undefined), "unknown");
});

test("one summary per minute, with sent excluding deferred and cached calls", () => {
  const { tel, lines, advance } = setup();
  tel.record(rec());
  tel.record(rec({ outcome: "deferred", priority: "low", caller: "lib/sector-trend" }));
  tel.record(rec({ outcome: "cached" }));
  tel.record(rec({ remain: 120 }));
  assert.equal(lines.length, 0);
  advance(61_000);
  tel.record(rec()); // triggers the flush of the previous minute
  assert.equal(lines.length, 1);
  const s = lines[0];
  assert.equal(s.reason, "minute");
  assert.equal(s.calls, 4);
  assert.equal(s.sent, 2);
  assert.equal(s.minRemain, 120);
  assert.equal(s.outcome.deferred, 1);
  assert.equal(s.callers["app/company/[number]/page"], 3);
});

test("a burst is logged immediately, once per window, counting sent requests only", () => {
  const { tel, lines } = setup();
  for (let i = 0; i < BURST * 2; i++) tel.record(rec({ outcome: "deferred" }));
  assert.equal(lines.length, 0, "deferred calls spend nothing and must not trip the burst alarm");
  for (let i = 0; i < BURST + 5; i++) tel.record(rec());
  assert.equal(lines.length, 1);
  assert.equal(lines[0].reason, "burst");
});

test("flush with nothing recorded prints nothing", () => {
  const { tel, lines } = setup();
  tel.flush("exit");
  assert.equal(lines.length, 0);
});
