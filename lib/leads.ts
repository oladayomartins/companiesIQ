// ============================================================
// Founder-funnel lead capture
// ------------------------------------------------------------
// Stores a lead (service-role only — leads carry PII and are RLS-locked),
// sends a confirmation email via Resend (graceful: logs intent if not
// configured), and records funnel events for QR/campaign analytics.
// ============================================================
import "server-only";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export interface LeadInput {
  companyNumber: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  source?: string;
  partner?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Record a funnel event (scan/view/lead/consult). Best-effort. */
export async function recordFunnelEvent(companyNumber: string, event: string, source?: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  try {
    await admin.from("funnel_events").insert({ company_number: companyNumber, event, source: source ?? null });
  } catch {
    /* analytics is best-effort */
  }
}

async function sendConfirmation(lead: LeadInput, token: string, baseUrl: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERTS_FROM_EMAIL;
  const verifyUrl = `${baseUrl}/api/leads/verify?token=${token}`;
  const reportUrl = `${baseUrl}/company/${lead.companyNumber}/growth-report${lead.source ? `?source=${encodeURIComponent(lead.source)}` : ""}`;
  if (!key || !from) {
    console.log(`[lead] ${lead.email} for ${lead.companyNumber} — confirmation logged (set RESEND_API_KEY + ALERTS_FROM_EMAIL to send)`);
    return false;
  }
  const name = esc(lead.firstName || "there");
  const co = esc(lead.companyName || lead.companyNumber);
  const html = `
    <p>Hi ${name},</p>
    <p>Thanks for requesting your growth report for <strong>${co}</strong>.</p>
    <p>Please confirm your email to unlock the full report:</p>
    <p><a href="${verifyUrl}" style="background:#D9531F;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Confirm &amp; open report</a></p>
    <p>Or open it here: <a href="${reportUrl}">${reportUrl}</a></p>
    <p style="color:#7A7065;font-size:12px">Market data sourced from Companies House, ONS &amp; Nomis · CompaniesIQ</p>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: lead.email, subject: `Your growth report for ${co}`, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface LeadResult {
  ok: boolean;
  stored: boolean;
  emailed: boolean;
  error?: string;
}

export async function createLead(input: LeadInput, baseUrl: string): Promise<LeadResult> {
  if (!input.email || !EMAIL_RE.test(input.email)) return { ok: false, stored: false, emailed: false, error: "A valid email is required." };
  if (!input.companyNumber) return { ok: false, stored: false, emailed: false, error: "Missing company." };

  const token = randomUUID();
  const admin = getSupabaseAdmin();
  let stored = false;
  if (admin) {
    const { error } = await admin.from("leads").insert({
      company_number: input.companyNumber,
      company_name: input.companyName ?? null,
      first_name: input.firstName ?? null,
      last_name: input.lastName ?? null,
      email: input.email,
      phone: input.phone ?? null,
      source: input.source ?? null,
      partner: input.partner ?? null,
      verify_token: token,
    });
    stored = !error;
  }

  const emailed = await sendConfirmation(input, token, baseUrl);
  await recordFunnelEvent(input.companyNumber, "lead", input.source);
  return { ok: true, stored, emailed };
}

/** Mark a lead verified by its token. Returns the lead's company number for redirect. */
export async function verifyLead(token: string): Promise<{ ok: boolean; companyNumber?: string; source?: string }> {
  const admin = getSupabaseAdmin();
  if (!admin || !token) return { ok: false };
  const { data, error } = await admin
    .from("leads")
    .update({ verified: true })
    .eq("verify_token", token)
    .select("company_number, source")
    .maybeSingle();
  if (error || !data) return { ok: false };
  return { ok: true, companyNumber: data.company_number ?? undefined, source: data.source ?? undefined };
}
