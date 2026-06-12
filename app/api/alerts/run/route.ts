// ============================================================
// Alerts run endpoint (daily cron target — pair with /api/ingest).
// Evaluates active alert rules against recently incorporated companies, then:
//   · de-duplicates against alert_hits (only genuinely NEW matches),
//   · delivers webhook / slack matches immediately (per alert),
//   · batches email matches into ONE branded "morning digest" per recipient,
//   · records the new matches in alert_hits so they're never re-sent.
// Auth: INGEST_SECRET (manual) or CRON_SECRET (Vercel Cron).
// Dev: POST a { alerts: AlertRule[] } body to dry-run rules (no dedup/send).
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { explore, LIVE } from "@/lib/data";
import { matchAll, ruleSummary, type AlertRule } from "@/lib/alerts";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { cronAuth } from "@/lib/cron-auth";
import { SITE_URL } from "@/lib/site";

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

type Match = { number: string; name: string };

async function loadRules(req: NextRequest): Promise<AlertRule[]> {
  // Body-provided rules honoured ONLY outside production (SSRF/abuse guard).
  if (!IS_PROD) {
    try {
      const body = await req.json();
      if (Array.isArray(body?.alerts)) return body.alerts as AlertRule[];
    } catch {
      /* no body */
    }
  }
  const supabase = getSupabaseAdmin();
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data } = await supabase.from("alerts").select("*").eq("active", true);
  return (data ?? []) as AlertRule[];
}

// ---- webhook / slack delivery (per alert, immediate) ----------------------
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

async function deliverPush(rule: AlertRule, matches: Match[]): Promise<{ ok: boolean; detail: string }> {
  if (!rule.destination || !isSafeUrl(rule.destination)) return { ok: false, detail: "blocked/empty destination" };
  try {
    if (rule.channel === "webhook") {
      const res = await fetch(rule.destination, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert: rule.name, rule: ruleSummary(rule), matches, count: matches.length }),
      });
      return { ok: res.ok, detail: `webhook ${res.status}` };
    }
    const text = `*${rule.name}* — ${matches.length} new match(es):\n` + matches.map((m) => `• ${m.name} (${m.number})`).join("\n");
    const res = await fetch(rule.destination, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    return { ok: res.ok, detail: `slack ${res.status}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "delivery error" };
  }
}

// ---- branded morning digest (one email per recipient) ---------------------
function digestHtml(sections: { name: string; summary: string; matches: Match[] }[]): string {
  const total = sections.reduce((n, s) => n + s.matches.length, 0);
  const blocks = sections
    .map((s) => {
      const rows = s.matches
        .map(
          (m) =>
            `<tr><td style="padding:8px 0;border-bottom:1px solid #ECE4D8"><a href="${SITE_URL}/company/${esc(
              m.number
            )}" style="color:#1C1815;text-decoration:none;font-weight:600">${esc(m.name)}</a><br><span style="color:#8a8178;font-family:monospace;font-size:12px">${esc(
              m.number
            )}</span></td></tr>`
        )
        .join("");
      return `<div style="margin:0 0 24px"><div style="font-size:13px;color:#8a8178;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">${esc(
        s.name
      )}</div><div style="font-size:13px;color:#8a8178;margin-bottom:10px">${esc(s.summary)} · ${s.matches.length} new</div><table style="width:100%;border-collapse:collapse">${rows}</table></div>`;
    })
    .join("");
  return `<div style="background:#FAF6EF;padding:32px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1C1815">
    <div style="max-width:560px;margin:0 auto">
      <div style="font-size:20px;font-weight:800;margin-bottom:4px">Companies<span style="color:#D9531F">IQ</span></div>
      <div style="font-size:22px;font-weight:800;margin:12px 0 4px">Your morning digest</div>
      <div style="font-size:14px;color:#5c544c;margin-bottom:24px">${total} new compan${total === 1 ? "y" : "ies"} matched your alerts on the UK register.</div>
      ${blocks}
      <div style="margin-top:8px"><a href="${SITE_URL}/app/companies" style="display:inline-block;background:#D9531F;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Open CompaniesIQ →</a></div>
      <div style="color:#8a8178;font-size:12px;margin-top:24px;border-top:1px solid #ECE4D8;padding-top:14px">Sourced from Companies House. Manage your alerts in CompaniesIQ.</div>
    </div>
  </div>`;
}

async function sendDigest(to: string, sections: { name: string; summary: string; matches: Match[] }[]): Promise<{ ok: boolean; detail: string }> {
  const total = sections.reduce((n, s) => n + s.matches.length, 0);
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERTS_FROM_EMAIL;
  if (!resendKey || !from) {
    console.log(`[digest] to=${to} new=${total} (set RESEND_API_KEY + ALERTS_FROM_EMAIL to send)`);
    return { ok: true, detail: "logged (no email provider configured)" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: `CompaniesIQ · ${total} new compan${total === 1 ? "y" : "ies"} matched your alerts`, html: digestHtml(sections) }),
    });
    return { ok: res.ok, detail: `digest ${res.status}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "digest error" };
  }
}

async function handle(req: NextRequest) {
  const { ok, configured } = cronAuth(req.headers.get("authorization"));
  if (IS_PROD && !configured) return NextResponse.json({ error: "INGEST_SECRET or CRON_SECRET must be set in production" }, { status: 503 });
  if (configured && !ok) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const rules = await loadRules(req);
  if (!rules.length) return NextResponse.json({ evaluated: 0, note: "No active alert rules." });

  const supabase = getSupabaseAdmin();
  const recent = (await explore({ incorporatedFrom: LIVE ? isoDaysAgo(7) : undefined, status: ["active"], size: 100 })).results;

  // recipient email → digest sections
  const digests = new Map<string, { name: string; summary: string; matches: Match[] }[]>();
  const report: { alert: string; new: number; delivery?: string }[] = [];

  for (const rule of rules) {
    if (rule.active === false) continue;
    const matched = matchAll(rule, recent).map((m) => ({ number: m.number, name: m.name }));
    if (!matched.length) {
      report.push({ alert: rule.name, new: 0 });
      continue;
    }

    // De-dupe against companies already reported for this alert.
    let fresh = matched;
    if (supabase && rule.id) {
      const { data: seen } = await supabase
        .from("alert_hits")
        .select("company_number")
        .eq("alert_id", rule.id)
        .in("company_number", matched.map((m) => m.number));
      const seenSet = new Set((seen ?? []).map((s) => s.company_number as string));
      fresh = matched.filter((m) => !seenSet.has(m.number));
    }
    if (!fresh.length) {
      report.push({ alert: rule.name, new: 0 });
      continue;
    }

    // Record the new hits so they're never re-sent.
    if (supabase && rule.id) {
      await supabase.from("alert_hits").insert(fresh.map((m) => ({ alert_id: rule.id, company_number: m.number, company_name: m.name, delivered: true })));
    }

    if (rule.channel === "email" && rule.destination) {
      const arr = digests.get(rule.destination) ?? [];
      arr.push({ name: rule.name, summary: ruleSummary(rule), matches: fresh });
      digests.set(rule.destination, arr);
      report.push({ alert: rule.name, new: fresh.length, delivery: "queued for digest" });
    } else {
      const d = await deliverPush(rule, fresh);
      report.push({ alert: rule.name, new: fresh.length, delivery: d.detail });
    }
  }

  // Send one digest per recipient.
  const digestResults = [];
  for (const [to, sections] of digests) {
    const r = await sendDigest(to, sections);
    digestResults.push({ to, new: sections.reduce((n, s) => n + s.matches.length, 0), detail: r.detail });
  }

  return NextResponse.json({ evaluated: rules.length, candidates: recent.length, digests: digestResults.length, report, digestResults });
}

export async function POST(req: NextRequest) {
  return handle(req);
}
export async function GET(req: NextRequest) {
  return handle(req);
}
