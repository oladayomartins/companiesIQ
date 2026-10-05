// ============================================================
// Revenue Autopilot — lifecycle email templates + Resend send (server-only).
//
// Plain, personal, one call-to-action each. Every link carries UTM tags so the
// resulting sessions show up as autopilot traffic in GA4, and the CTA resumes
// checkout directly (/app/upgrade?plan=…&interval=… auto-starts Stripe).
// Degrades like lib/free-alerts.ts: without Resend it logs instead of sending.
// ============================================================
import "server-only";
import { SITE_URL } from "@/lib/site";
import { planById, type PlanId } from "@/lib/subscription";
import type { Decision, Template } from "@/lib/growth/playbook";

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function utm(path: string, campaign: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${SITE_URL}${path}${sep}utm_source=autopilot&utm_medium=email&utm_campaign=${campaign}`;
}

function button(href: string, label: string): string {
  return `<p style="margin:22px 0"><a href="${href}" style="background:#D9531F;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-family:Arial,sans-serif;font-weight:600">${esc(label)}</a></p>`;
}

function shell(inner: string, unsubToken: string): string {
  return `<div style="margin:0;padding:0;background:#FAF6EF">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6EF;padding:32px 0"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:92%">
      <tr><td style="padding:0 4px 20px;font-family:Georgia,serif;font-size:21px;font-weight:700;color:#1C1815">
        <span style="display:inline-block;width:26px;height:26px;background:#D9531F;border-radius:7px;vertical-align:middle;margin-right:8px"></span>Companies<span style="color:#D9531F">IQ</span>
      </td></tr>
      <tr><td style="background:#fff;border:1px solid #E2D8C8;border-radius:16px;padding:32px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1C1815">
        ${inner}
        <p style="margin:22px 0 0;font-size:12px;color:#A39A8E">You're getting this because you have a CompaniesIQ account.
        <a href="${SITE_URL}/api/growth/unsubscribe?token=${unsubToken}" style="color:#A39A8E">Unsubscribe from these emails</a>.</p>
      </td></tr>
    </table>
  </td></tr></table></div>`;
}

export interface RenderInput {
  decision: Decision;
  name: string | null;
  token: string;
}

export function renderEmail({ decision, name, token }: RenderInput): { subject: string; html: string } {
  const plan = planById((decision.plan as PlanId) || "analyst");
  const hi = `Hi ${esc(name?.split(" ")[0] || "there")},`;
  const price = decision.billing === "annual" ? `£${plan.annual}/mo billed annually` : `£${plan.monthly}/month`;
  const resume = utm(`/app/upgrade?plan=${plan.id}&interval=${decision.billing}`, decision.template);
  const monthly = utm(`/app/upgrade?plan=${plan.id}&interval=monthly`, decision.template);
  const feats = plan.features
    .slice(0, 5)
    .map((f) => `<li style="margin:2px 0">${esc(f)}</li>`)
    .join("");

  const bodies: Record<Template, { subject: string; inner: string }> = {
    checkout_recovery: {
      subject: `Your ${plan.name} plan is one click away`,
      inner: `<p>${hi}</p>
        <p>You started upgrading to <strong>CompaniesIQ ${esc(plan.name)}</strong> but didn't finish checkout. We've saved your choice — pick up exactly where you left off:</p>
        ${button(resume, `Finish upgrading — ${price}`)}
        <p>What you unlock straight away:</p><ul style="padding-left:18px">${feats}</ul>
        <p>Cancel any time from Settings. If something got in the way — price, a question about the data, a payment issue — just reply to this email and a real person will help.</p>`,
    },
    checkout_recovery_2: {
      subject: "Still deciding? Start monthly and cancel any time",
      inner: `<p>${hi}</p>
        <p>A quick follow-up: if committing for a year felt like a lot, <strong>${esc(plan.name)} is £${plan.monthly}/month</strong> with no lock-in — cancel from Settings whenever you like.</p>
        ${button(monthly, `Start ${plan.name} monthly`)}
        <p>Not the right fit? Reply and tell me what you were hoping to do — it genuinely shapes what we build next.</p>`,
    },
    paywall_followup: {
      subject: "The reports you tried to open are in Analyst",
      inner: `<p>${hi}</p>
        <p>You've run into a few locked features on CompaniesIQ recently. Those are part of <strong>${esc(plan.name)}</strong> — from £${plan.monthly}/month:</p>
        <ul style="padding-left:18px">${feats}</ul>
        ${button(monthly, `Unlock ${plan.name}`)}
        <p>Monthly billing, cancel any time. Questions? Just reply.</p>`,
    },
    activation: {
      subject: "3 things to try in CompaniesIQ this week",
      inner: `<p>${hi}</p>
        <p>Thanks for joining CompaniesIQ. Three quick ways people get value in their first session:</p>
        <ol style="padding-left:18px">
          <li><a href="${utm("/search", "activation")}" style="color:#D9531F">Look up any UK company</a> — status, filings, officers and a scored summary.</li>
          <li><a href="${utm("/free-alerts", "activation")}" style="color:#D9531F">Get new companies in your sector</a> emailed weekly, free.</li>
          <li><a href="${utm("/blog/newly-registered-companies-uk", "activation")}" style="color:#D9531F">Prospect newly registered companies</a> before anyone else calls them.</li>
        </ol>
        <p>When you need full reports, exports and watchlists, ${esc(plan.name)} starts at £${plan.monthly}/month. Reply any time with questions.</p>`,
    },
  };

  const b = bodies[decision.template];
  return { subject: b.subject, html: shell(b.inner, token) };
}

/** Send via Resend. Returns true only when Resend accepted the message. */
export async function sendEmail(to: string | string[], subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.GROWTH_FROM_EMAIL || process.env.ALERTS_FROM_EMAIL;
  if (!key || !from) {
    console.log(`[autopilot] email to ${String(to)} — "${subject}" logged (set RESEND_API_KEY + GROWTH_FROM_EMAIL to send)`);
    return false;
  }
  const replyTo = process.env.GROWTH_REPLY_TO;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface DigestLead {
  email: string;
  score: number;
  stage: string;
  signals: string[];
  action: string;
}

/** Internal hot-lead digest for the admins — people worth a personal note. */
export function renderDigest(leads: DigestLead[], summary: string): { subject: string; html: string } {
  const rows = leads
    .map(
      (l) => `<tr>
        <td style="padding:8px 6px;border-bottom:1px solid #EEE6D8"><a href="mailto:${esc(l.email)}" style="color:#1C1815">${esc(l.email)}</a><br><span style="color:#7A7065;font-size:12px">${esc(l.signals.join(" · "))}</span></td>
        <td style="padding:8px 6px;border-bottom:1px solid #EEE6D8;text-align:right;font-weight:700">${l.score}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #EEE6D8;font-size:13px">${esc(l.stage)}<br><span style="color:#7A7065">${esc(l.action)}</span></td>
      </tr>`,
    )
    .join("");
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1C1815;max-width:640px">
    <h2 style="font-family:Georgia,serif;margin:0 0 6px">Revenue Autopilot — daily digest</h2>
    <p style="color:#7A7065;margin:0 0 16px">${esc(summary)}</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
      <tr><th align="left" style="padding:6px;font-size:11px;color:#7A7065">ACCOUNT</th><th align="right" style="padding:6px;font-size:11px;color:#7A7065">INTENT</th><th align="left" style="padding:6px;font-size:11px;color:#7A7065">STAGE / ACTION</th></tr>
      ${rows}
    </table>
    <p style="margin-top:18px"><a href="${SITE_URL}/app/revenue" style="color:#D9531F">Open the Revenue screen →</a></p>
  </div>`;
  return { subject: `Autopilot: ${leads.length} hot lead${leads.length === 1 ? "" : "s"} worth a personal note`, html };
}
