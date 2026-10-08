// Unit tests for lib/agent-telemetry.ts.   npm run test:quota (runs all CH test files)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const src = readFileSync(new URL("../lib/agent-telemetry.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const file = join(mkdtempSync(join(tmpdir(), "agent-tel-")), "agent-telemetry.mjs");
writeFileSync(file, js);
const { classifyAgent, AgentCounter } = await import(file);

test("known crawlers by name", () => {
  const cases = {
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)": "Googlebot",
    "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.126 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)": "Googlebot",
    "Googlebot-Image/1.0": "Googlebot-Image",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)": "Bingbot",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)": "GPTBot",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)": "ClaudeBot",
    "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)": "AhrefsBot",
    "Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)": "SemrushBot",
    "Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)": "Bytespider",
    "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)": "Meta",
    "Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)": "Amazonbot",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)": "PerplexityBot",
  };
  for (const [ua, name] of Object.entries(cases)) assert.equal(classifyAgent(ua), name, ua);
});

test("unknown bots by their own token, tools, browsers, empty", () => {
  assert.equal(classifyAgent("Mozilla/5.0 (compatible; MegaIndexbot/1.0)"), "bot:MegaIndexbot");
  assert.equal(classifyAgent("python-requests/2.31.0"), "tool:python-requests");
  assert.equal(classifyAgent("curl/8.4.0"), "tool:curl");
  assert.equal(classifyAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"), "browser");
  assert.equal(classifyAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36"), "tool:HeadlessChrome");
  assert.equal(classifyAgent(""), "none");
  assert.equal(classifyAgent(null), "none");
});

test("one line a minute with counts per agent", () => {
  let t = 0;
  const lines = [];
  const c = new AgentCounter({ instance: "x" }, (l) => lines.push(JSON.parse(l.replace("[ch-agents] ", ""))), () => t);
  for (let i = 0; i < 5; i++) c.record("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");
  c.record("Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)");
  assert.equal(lines.length, 0);
  t += 61_000;
  c.record("curl/8.4.0");
  assert.equal(lines.length, 1);
  assert.equal(lines[0].requests, 6);
  assert.deepEqual(lines[0].agents, { Googlebot: 5, AhrefsBot: 1 });
});
