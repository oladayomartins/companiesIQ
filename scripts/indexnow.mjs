// Notify IndexNow (Bing, Yandex, and search products built on Bing such as
// ChatGPT search and Copilot) that URLs are new or changed, so they are crawled
// now rather than whenever the sitemap is next read. Google does not take part
// in IndexNow — for Google the sitemap and Search Console remain the route.
//
// The key is public by design: IndexNow proves ownership by fetching
// https://<host>/<key>.txt, which lives in public/.
//
// Usage:  node scripts/indexnow.mjs /blog/some-slug /blog/another   # paths or full URLs
//         node scripts/indexnow.mjs --blog-since 2026-10-08          # every post published since a date
import { readFileSync } from "node:fs";

const KEY = "6357946f75e2a928dac391fca0a7e9a4";
const HOST = "www.companiesiq.co.uk";
const ORIGIN = `https://${HOST}`;

function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const line = readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n").find((l) => l.startsWith(name + "="));
    return line ? line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "") : null;
  } catch {
    return null;
  }
}

const args = process.argv.slice(2);
let urls = args.filter((a) => !a.startsWith("--")).map((a) => (a.startsWith("http") ? a : ORIGIN + a));

const sinceIdx = args.indexOf("--blog-since");
if (sinceIdx >= 0) {
  const since = args[sinceIdx + 1];
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase env is required for --blog-since");
  const res = await fetch(`${url}/rest/v1/posts?select=slug&status=eq.published&published_at=gte.${since}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  urls.push(...(await res.json()).map((p) => `${ORIGIN}/blog/${p.slug}`));
}

urls = [...new Set(urls)].filter((u) => u.startsWith(ORIGIN));
if (!urls.length) {
  console.error("✗ No URLs on " + ORIGIN + " to submit.");
  process.exit(1);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${ORIGIN}/${KEY}.txt`, urlList: urls }),
});
// 200 = accepted; 202 = accepted, key validation pending.
console.log(`${res.ok ? "✓" : "✗"} IndexNow ${res.status} for ${urls.length} URL(s)`);
if (!res.ok) console.log(await res.text());
urls.forEach((u) => console.log("  " + u));
