// ============================================================
// Polite page fetcher — the only way this codebase touches a third-party site
// ------------------------------------------------------------
// Crawling someone else's website on a customer's behalf is the part of the
// contact pipeline that can embarrass us, so every request goes through here
// and here alone. It:
//
//   • identifies itself honestly (named UA + a URL explaining the bot),
//   • reads and obeys robots.txt before the first content request,
//   • refuses anything that isn't public http(s) — no file://, no redirects
//     into private address space (the classic SSRF hole in "fetch the
//     customer's website" features),
//   • caps time, size and redirects so one pathological host can't stall a
//     request or blow the function's memory,
//   • fetches HTML only, one page at a time per host.
//
// Server-only. See docs/contact-enrichment.md §Legal & etiquette.
// ============================================================
import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { SITE_URL } from "@/lib/site";

export const BOT_NAME = "CompaniesIQBot";
export const USER_AGENT = `${BOT_NAME}/1.0 (+${SITE_URL}/bot)`;

const TIMEOUT_MS = 8_000;
const MAX_BYTES = 1_500_000; // 1.5 MB of HTML is already an outlier
const MAX_REDIRECTS = 3;
/** Courtesy gap between two requests to the same host. */
const HOST_DELAY_MS = 750;

export interface FetchedPage {
  url: string; // the URL after redirects
  status: number;
  html: string;
  ok: boolean;
  error?: string;
}

// ---- SSRF guard -------------------------------------------------------------

/** RFC1918 + loopback + link-local + CGNAT + unique-local v6. */
function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    if (v6 === "::1" || v6 === "::") return true;
    if (/^f[cd]/.test(v6)) return true; // fc00::/7 unique-local
    if (v6.startsWith("fe80")) return true; // link-local
    // IPv4-mapped (::ffff:10.0.0.1) — re-check the embedded v4.
    const mapped = v6.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast + reserved
  return false;
}

const BLOCKED_HOST_SUFFIXES = [".local", ".internal", ".localhost", ".home.arpa"];

/**
 * Resolve the host and refuse anything that isn't a public address. Called for
 * the initial URL AND after every redirect, because a public host can redirect
 * to 127.0.0.1 or a cloud metadata endpoint.
 */
async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(`unsupported protocol ${url.protocol}`);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
    throw new Error(`blocked host ${host}`);
  }
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new Error(`blocked address ${host}`);
    return;
  }
  const addresses = await lookup(host, { all: true, verbatim: true });
  if (!addresses.length) throw new Error(`no address for ${host}`);
  for (const a of addresses) {
    if (isPrivateAddress(a.address)) throw new Error(`blocked address ${a.address} for ${host}`);
  }
}

// ---- robots.txt -------------------------------------------------------------

interface RobotsRules {
  disallow: string[];
  allow: string[];
}

/** Per-process robots cache. Serverless instances are short-lived, so this is
 *  a per-invocation courtesy rather than a long-term store. */
const robotsCache = new Map<string, RobotsRules | null>();
const lastHit = new Map<string, number>();

/**
 * Exported (with ruleMatches) because robots compliance is the part of this
 * module that has to be provably right, and both halves are pure.
 *
 * Parse robots.txt for the group that applies to us: a `User-agent:
 * CompaniesIQBot` block if one exists, otherwise the `*` block. Supports the
 * de-facto `Allow` override and `*`/`$` wildcards, which is what real sites use.
 */
export function parseRobots(text: string): RobotsRules {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim());
  const groups = new Map<string, RobotsRules>();
  let agents: string[] = [];
  let started = false;

  for (const line of lines) {
    const [rawKey, ...rest] = line.split(":");
    if (!rest.length) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (started) agents = [];
      agents.push(value.toLowerCase());
      started = false;
      for (const a of agents) if (!groups.has(a)) groups.set(a, { disallow: [], allow: [] });
      continue;
    }
    if (key !== "disallow" && key !== "allow") continue;
    started = true;
    for (const a of agents) {
      const g = groups.get(a);
      if (!g) continue;
      if (key === "disallow" && value) g.disallow.push(value);
      if (key === "allow" && value) g.allow.push(value);
    }
  }

  return groups.get(BOT_NAME.toLowerCase()) ?? groups.get("*") ?? { disallow: [], allow: [] };
}

export function ruleMatches(path: string, rule: string): boolean {
  const anchored = rule.endsWith("$");
  const pattern = anchored ? rule.slice(0, -1) : rule;
  const parts = pattern.split("*");
  let idx = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    const at = i === 0 ? (path.startsWith(part) ? 0 : -1) : path.indexOf(part, idx);
    if (at === -1) return false;
    idx = at + part.length;
  }
  return anchored ? idx === path.length : true;
}

/** Fetch (and cache) robots.txt for an origin. A missing or broken robots.txt
 *  means "no restrictions" — the standard's own default. */
async function getRobots(origin: string): Promise<RobotsRules | null> {
  if (robotsCache.has(origin)) return robotsCache.get(origin) ?? null;
  let rules: RobotsRules | null = null;
  try {
    const url = new URL("/robots.txt", origin);
    await assertPublicUrl(url);
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/plain" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
      cache: "no-store",
    });
    // 4xx = no robots file = allowed. 5xx is conservatively treated the same
    // way a 404 is, rather than blocking a site because its server hiccupped.
    rules = res.ok ? parseRobots((await res.text()).slice(0, 200_000)) : { disallow: [], allow: [] };
  } catch {
    rules = { disallow: [], allow: [] };
  }
  robotsCache.set(origin, rules);
  return rules;
}

/** True when robots.txt permits us to fetch this path. Longest matching rule
 *  wins, with Allow beating Disallow at equal length (Google's resolution). */
export async function isAllowedByRobots(url: URL): Promise<boolean> {
  const rules = await getRobots(url.origin);
  if (!rules) return true;
  const path = url.pathname + url.search;
  let bestDisallow = -1;
  let bestAllow = -1;
  for (const r of rules.disallow) if (ruleMatches(path, r) && r.length > bestDisallow) bestDisallow = r.length;
  for (const r of rules.allow) if (ruleMatches(path, r) && r.length > bestAllow) bestAllow = r.length;
  if (bestDisallow === -1) return true;
  return bestAllow >= bestDisallow;
}

// ---- The fetch --------------------------------------------------------------

async function politeDelay(host: string): Promise<void> {
  const last = lastHit.get(host);
  const wait = last ? HOST_DELAY_MS - (Date.now() - last) : 0;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit.set(host, Date.now());
}

/**
 * Fetch one HTML page, obeying robots.txt, with manual redirect handling so
 * every hop is re-checked against the SSRF guard. Never throws — a failure is
 * returned as `{ ok: false, error }` so the pipeline can record it as evidence
 * instead of collapsing.
 */
export async function fetchPage(rawUrl: string, opts: { checkRobots?: boolean } = {}): Promise<FetchedPage> {
  const checkRobots = opts.checkRobots ?? true;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { url: rawUrl, status: 0, html: "", ok: false, error: "invalid URL" };
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    try {
      await assertPublicUrl(url);
      if (checkRobots && !(await isAllowedByRobots(url))) {
        return { url: url.toString(), status: 0, html: "", ok: false, error: "disallowed by robots.txt" };
      }
      await politeDelay(url.hostname);

      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "manual",
        cache: "no-store",
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return { url: url.toString(), status: res.status, html: "", ok: false, error: "redirect without location" };
        url = new URL(location, url);
        continue;
      }

      if (!res.ok) return { url: url.toString(), status: res.status, html: "", ok: false, error: `HTTP ${res.status}` };

      const type = res.headers.get("content-type") ?? "";
      if (type && !/text\/html|application\/xhtml|text\/plain/i.test(type)) {
        return { url: url.toString(), status: res.status, html: "", ok: false, error: `not HTML (${type.split(";")[0]})` };
      }

      const html = await readCapped(res);
      return { url: url.toString(), status: res.status, html, ok: true };
    } catch (e) {
      const error = e instanceof Error ? e.message : "fetch failed";
      return { url: url.toString(), status: 0, html: "", ok: false, error };
    }
  }
  return { url: url.toString(), status: 0, html: "", ok: false, error: "too many redirects" };
}

/** Read the body but stop at MAX_BYTES, so a streamed multi-gigabyte
 *  "text/html" response can't exhaust the function's memory. */
async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return (await res.text()).slice(0, MAX_BYTES);
  const decoder = new TextDecoder();
  let out = "";
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    out += decoder.decode(value, { stream: true });
    if (bytes >= MAX_BYTES) {
      await reader.cancel().catch(() => {});
      break;
    }
  }
  return out;
}
