// ============================================================
// Alerts run endpoint (cron target — pair with /api/ingest).
// Evaluates active alert rules against companies incorporated in the
// recent window, then delivers matches:
//   · webhook / slack → real HTTP POST
//   · email           → requires a provider; logged as intent here
// Demo mode: POST a { alerts: AlertRule[] } body to evaluate rules
// that aren't persisted in Supabase.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { explore, LIVE } from "@/lib/data";
import { matchAll, type AlertRule } from "@/lib/alerts";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const IS_PROD = process.env.NODE_ENV === "production";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function loadRules(req: NextRequest): Promise<AlertRule[]> {
  // Body-provided rules are honoured ONLY outside production. In production
  // they're ignored — they'd let an unauthenticated caller make the server POST
  // to arbitrary URLs (SSRF) and send arbitrary emails (abuse). Prod always
  // evaluates the user's persisted, RLS-owned rules instead.
  if (!IS_PROD) {
    try {
      const body = await req.json();
      if (Array.isArray(body?.alerts)) return body.alerts as AlertRule[];
    } catch {
      /* no body */
    }
  }
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase.from("alerts").select("*").eq("active", true);
  return (data ?? []) as AlertRule[];
}

/** Basic SSRF guard: only allow https POSTs to non-private hosts. */
function isSafeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
    if (h === "::1" || h.startsWith("fc") || h.startsWith("fd")) return false;
    return true;
  } catch {
    return false;
  }
}

async function deliver(rule: AlertRule, matches: { number: string; name: string }[]): Promise<{ ok: boolean; detail: string }> {
  if (!matches.length) return { ok: true, detail: "no matches" };
  const payload = {
    alert: rule.name,
    rule: { sector: rule.sector, sic: rule.sic, region: rule.region, status: rule.status },
    matches,
    count: matches.length,
  };
  try {
    if (rule.channel === "webhook" && rule.destination) {
      if (!isSafeUrl(rule.destination)) return { ok: false, detail: "blocked destination (must be https, non-private)" };
      const res = await fetch(rule.destination, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      return { ok: res.ok, detail: `webhook ${res.status}` };
    }
    if (rule.channel === "slack" && rule.destination) {
      if (!isSafeUrl(rule.destination)) return { ok: false, detail: "blocked destination (must be https, non-private)" };
      const text = `*${rule.name}* — ${matches.length} new match(es):\n` + matches.map((m) => `• ${m.name} (${m.number})`).join("\n");
      const res = await fetch(rule.destination, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      return { ok: res.ok, detail: `slack ${res.status}` };
    }
    // Email via Resend when configured; otherwise logged as intent.
    if (rule.channel === "email" && rule.destination) {
      const resendKey = process.env.RESEND_API_KEY;
      const from = process.env.ALERTS_FROM_EMAIL;
      if (resendKey && from) {
        const rows = matches.map((m) => `<li><strong>${esc(m.name)}</strong> — ${esc(m.number)}</li>`).join("");
        const html = `<h2>${esc(rule.name)}</h2><p>${matches.length} new match(es) on the UK register:</p><ul>${rows}</ul><p style="color:#7A7065;font-size:12px">Sourced from Companies House · CompaniesIQ</p>`;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: rule.destination, subject: `CompaniesIQ · ${rule.name} (${matches.length})`, html }),
        });
        return { ok: res.ok, detail: `email ${res.status}` };
      }
      console.log(`[alert:email] to=${rule.destination} alert="${rule.name}" matches=${matches.length}`);
      return { ok: true, detail: "email logged (set RESEND_API_KEY + ALERTS_FROM_EMAIL to send)" };
    }
    return { ok: true, detail: "no channel matched" };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "delivery error" };
  }
}

async function handle(req: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  const auth = req.headers.get("authorization");
  if (IS_PROD && !secret) {
    return NextResponse.json({ error: "INGEST_SECRET must be set in production" }, { status: 503 });
  }
  // Fail closed: when a secret is set, a matching bearer token is required
  // (a missing header must NOT bypass the check).
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const rules = await loadRules(req);
  if (!rules.length) return NextResponse.json({ evaluated: 0, note: "No active alert rules." });

  // Recent incorporations to evaluate against. In live mode this is the
  // trailing-7-day window; in sample/demo mode the seed dates predate that
  // window, so evaluate against the full sample set instead.
  const { results, live } = await explore({ incorporatedFrom: LIVE ? isoDaysAgo(7) : undefined, status: ["active"], size: 100 });

  const report = [];
  for (const rule of rules) {
    if (rule.active === false) continue;
    const matches = matchAll(rule, results).map((m) => ({ number: m.number, name: m.name }));
    const delivery = await deliver(rule, matches);
    report.push({ alert: rule.name, matches: matches.length, delivery });
  }
  return NextResponse.json({ evaluated: rules.length, live, results: results.length, report });
}

export async function POST(req: NextRequest) {
  return handle(req);
}
export async function GET(req: NextRequest) {
  return handle(req);
}
