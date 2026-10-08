// Unit tests for lib/ch-cache-policy.ts.   npm run test:quota (runs all CH test files)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const src = readFileSync(new URL("../lib/ch-cache-policy.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const file = join(mkdtempSync(join(tmpdir(), "ch-cache-")), "ch-cache-policy.mjs");
writeFileSync(file, js);
const { cacheSecondsFor, HOUR, MINUTES } = await import(file);

test("company profile and filing history: 1 hour", () => {
  assert.equal(cacheSecondsFor("/company/00445790"), HOUR);
  assert.equal(cacheSecondsFor("/company/SC123456/filing-history?items_per_page=25"), HOUR);
});

test("officers, PSCs, charges and appointments: 6 hours", () => {
  assert.equal(cacheSecondsFor("/company/00445790/officers?items_per_page=35"), 6 * HOUR);
  assert.equal(cacheSecondsFor("/company/00445790/persons-with-significant-control?items_per_page=25"), 6 * HOUR);
  assert.equal(cacheSecondsFor("/company/00445790/charges"), 6 * HOUR);
  assert.equal(cacheSecondsFor("/officers/abc123/appointments?items_per_page=50"), 6 * HOUR);
});

test("searches stay fresh: 5 minutes", () => {
  assert.equal(cacheSecondsFor("/advanced-search/companies?sic_codes=62012&size=1"), 5 * MINUTES);
  assert.equal(cacheSecondsFor("/search/companies?q=tesco"), 5 * MINUTES);
  assert.equal(cacheSecondsFor("/search/officers?q=smith"), 5 * MINUTES);
});

test("unknown and nested company paths fall back to the short window", () => {
  assert.equal(cacheSecondsFor("/company/00445790/registers"), 5 * MINUTES);
  assert.equal(cacheSecondsFor("/company/00445790/officers/xyz/appointments"), 5 * MINUTES);
});
