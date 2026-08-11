// ============================================================
// Free new-company alerts — data access + email
// ------------------------------------------------------------
// The lead-magnet backend: store an email-only subscription, send a welcome
// email, and (weekly, via cron) a personalized digest of newly incorporated
// companies matching the subscriber's sector/region. Reuses the Resend pattern
// (lib/leads.ts) and `explore` (lib/data.ts). Degrades gracefully with no
// Supabase (won't store) or no Resend (won't email) — never throws.
// ============================================================
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { explore } from "@/lib/data";
import { isoDaysAgo } from "@/lib/companies-house";
import { deriveIdentity } from "@/lib/identity";
import { alertScopeLabel } from "@/lib/alert-options";
import { SITE_URL } from "@/lib/site";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FROM_LABEL = "Market data from Companies House, ONS & Nomis · CompaniesIQ";

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export interface Subscriber {
  id: string;
  email: string;
  first_name: string | null;
  company: string | null;
  sector: string; // '' = any
  region: string; // '' = anywhere
  token: string;
  status: string;
  last_sent_at: string | null;
}

// ---- Resend send (graceful) ----
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERTS_FROM_EMAIL;
  if (!key || !from) {
    console.log(`[free-alert] email to ${to} — "${subject}" logged (set RESEND_API_KEY + ALERTS_FROM_EMAIL to send)`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---- Email templates (on-brand, inline styles) ----
function shell(inner: string, unsubToken?: string): string {
  const unsub = unsubToken
    ? `<p style="margin:22px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#A39A8E">
         You’re getting this because you asked for new-company alerts.
         <a href="${SITE_URL}/api/free-alerts/unsubscribe?token=${unsubToken}" style="color:#A39A8E">Unsubscribe</a>.
       </p>`
    : "";
  return `<div style="margin:0;padding:0;background:#FAF6EF">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6EF;padding:32px 0">
      <tr><td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:92%">
          <tr><td style="padding:0 4px 20px;font-family:Georgia,serif;font-size:21px;font-weight:700;color:#1C1815">
            <span style="display:inline-block;width:26px;height:26px;background:#D9531F;border-radius:7px;vertical-align:middle;margin-right:8px"></span>
            Companies<span style="color:#D9531F">IQ</span>
          </td></tr>
          <tr><td style="background:#fff;border:1px solid #E2D8C8;border-radius:16px;padding:32px">
            ${inner}
            ${unsub}
          </td></tr>
          <tr><td style="padding:16px 8px 0;font-family:Arial,sans-serif;font-size:12px;color:#A39A8E">${FROM_LABEL}</td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

function welcomeHtml(greeting: string, scope: string): string {
  return shell(
    `<h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:23px;color:#1C1815">You’re subscribed ✓</h1>
     <p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#57514A">${esc(greeting)}, you’ll now get a free weekly email of <strong>${esc(scope)}</strong> — straight from the Companies House register, the day they form.</p>
     <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#57514A">Your first digest lands within a week. Want more — filters, watchlists, exports and daily alerts? <a href="${SITE_URL}/pricing" style="color:#D9531F">See the plans</a>.</p>`,
  );
}

function digestHtml(greeting: string, scope: string, rows: { number: string; name: string; sub: string }[], token: string): string {
  const items = rows
    .map(
      (r) => `<tr><td style="padding:12px 0;border-bottom:1px solid #F0E9DD">
        <a href="${SITE_URL}/company/${r.number}" style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#1C1815;text-decoration:none">${esc(r.name)}</a>
        <div style="font-family:Arial,sans-serif;font-size:12.5px;color:#7A7065;margin-top:2px">${esc(r.sub)}</div>
      </td></tr>`,
    )
    .join("");
  return shell(
    `<h1 style="margin:0 0 6px;font-family:Georgia,serif;font-size:23px;color:#1C1815">${rows.length} new ${rows.length === 1 ? "company" : "companies"} this week</h1>
     <p style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:14px;color:#57514A">${esc(greeting)} — here are the latest <strong>${esc(scope)}</strong> on the register.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
     <p style="margin:22px 0 0"><a href="${SITE_URL}/search" style="background:#D9531F;color:#fff;padding:11px 18px;border-radius:9px;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600">Search all new companies →</a></p>`,
    token,
  );
}

// ---- Subscribe ----
export interface SubscribeInput {
  email: string;
  firstName?: string;
  company?: string;
  sector?: string;
  region?: string;
  source?: string;
}

export async function subscribeFreeAlert(input: SubscribeInput): Promise<{ ok: boolean; error?: string }> {
  const email = (input.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "A valid email is required." };

  const id = deriveIdentity(email, { firstName: input.firstName, company: input.company });
  const sector = (input.sector || "").trim();
  const region = (input.region || "").trim();
  const scope = alertScopeLabel(sector, region);

  const admin = getSupabaseAdmin();
  let token: string | undefined;
  if (admin) {
    const { data, error } = await admin
      .from("alert_subscribers")
      .upsert(
        {
          email,
          first_name: input.firstName?.trim() || id.firstName,
          company: input.company?.trim() || id.company,
          sector,
          region,
          source: input.source ?? null,
          status: "active",
        },
        { onConflict: "email,sector,region" },
      )
      .select("token")
      .maybeSingle();
    if (error) return { ok: false, error: "Couldn’t save your subscription — try again." };
    token = (data?.token as string) ?? undefined;
  }

  // Welcome email (also serves as the opt-in confirmation). Best-effort.
  await sendEmail(email, "You’re subscribed to CompaniesIQ new-company alerts", welcomeHtml(id.greeting, scope)).catch(() => false);
  void token;
  return { ok: true };
}

export async function unsubscribeByToken(token: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin || !token) return false;
  const { error } = await admin.from("alert_subscribers").update({ status: "unsubscribed" }).eq("token", token);
  return !error;
}

export async function getActiveSubscribers(): Promise<Subscriber[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data } = await admin.from("alert_subscribers").select("*").eq("status", "active");
  return (data ?? []) as Subscriber[];
}

// ---- Weekly digest ----
/** New (last `days`) companies for a sector/region scope. Deduped, capped. */
async function newCompaniesFor(sector: string, region: string, days = 7, limit = 10) {
  const { results } = await explore({
    sector: sector || undefined,
    region: region || undefined,
    incorporatedFrom: isoDaysAgo(days),
    incorporatedTo: isoDaysAgo(0),
    status: ["active"],
    size: 40,
  });
  return results.slice(0, limit).map((r) => ({
    number: r.number,
    name: r.name,
    sub: [r.classification?.sector, r.locality || r.region, r.incorporated ? `formed ${r.incorporated}` : null]
      .filter(Boolean)
      .join(" · "),
  }));
}

/**
 * Send the weekly digest to every active subscriber. Groups by (sector, region)
 * so the Companies House query runs once per distinct scope. Best-effort per
 * recipient; returns counts. Called by the cron route.
 */
export async function runFreeAlertDigest(): Promise<{ subscribers: number; sent: number; scopes: number }> {
  const subs = await getActiveSubscribers();
  if (!subs.length) return { subscribers: 0, sent: 0, scopes: 0 };

  const byScope = new Map<string, Subscriber[]>();
  for (const s of subs) {
    const key = `${s.sector}||${s.region}`;
    (byScope.get(key) ?? byScope.set(key, []).get(key)!).push(s);
  }

  const admin = getSupabaseAdmin();
  let sent = 0;
  for (const [key, group] of byScope) {
    const [sector, region] = key.split("||");
    let rows: { number: string; name: string; sub: string }[] = [];
    try {
      rows = await newCompaniesFor(sector, region);
    } catch {
      continue; // register busy — skip this scope this run
    }
    if (!rows.length) continue; // nothing new → don't send an empty email
    const scope = alertScopeLabel(sector, region);
    for (const s of group) {
      const greeting = deriveIdentity(s.email, { firstName: s.first_name, company: s.company }).greeting;
      const ok = await sendEmail(s.email, `${rows.length} new ${scope} this week`, digestHtml(greeting, scope, rows, s.token));
      if (ok) {
        sent++;
        if (admin) await admin.from("alert_subscribers").update({ last_sent_at: new Date().toISOString() }).eq("id", s.id);
      }
    }
  }
  return { subscribers: subs.length, sent, scopes: byScope.size };
}
