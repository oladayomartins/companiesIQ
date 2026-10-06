// ============================================================
// Revenue Autopilot — engine (server-only).
//
// Loads every account's first-party history, asks the playbook what to do, and
// executes it according to the mode set on the admin Revenue screen:
//   off      → nothing.
//   dry_run  → log what WOULD be sent (growth_emails.status = 'dry_run').
//   live     → send via Resend, log status 'sent' / 'failed'.
// Also emails ADMIN_EMAILS a digest of hot leads worth a personal note.
// Runs daily from Vercel Cron (/api/cron/growth) or on demand from the admin.
// ============================================================
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { adminEmails, isAdminEmail, isPartnerEmail } from "@/lib/admin";
import { assess, TEMPLATE_LABELS, type Assessment, type UserSnapshot } from "@/lib/growth/playbook";
import { renderDigest, renderEmail, sendEmail, type DigestLead } from "@/lib/growth/emails";

export type AutopilotMode = "off" | "dry_run" | "live";

const DAY = 86_400_000;
const PAID = new Set(["active", "trialing"]);
// API calls are machine traffic, not a person engaging with the product.
const ACTIVITY_EXCLUDE = new Set(["api.call", "api.key.create", "api.key.revoke"]);

export class GrowthSetupError extends Error {}

type Admin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

/** Page through a query; the user base is small but don't silently cap at 1k. */
async function all<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await fetchPage(from, from + 999);
    if (error) throw new GrowthSetupError(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export interface LoadedAccount extends UserSnapshot {
  token: string;
  plan: string;
  /** How the signup visit started (null before attribution existed). */
  attribution: { landing: string | null; referrer: string | null; utmSource: string | null };
}

export async function loadAccounts(admin: Admin, now = Date.now()): Promise<LoadedAccount[]> {
  const since90 = new Date(now - 90 * DAY).toISOString();
  const since30 = new Date(now - 30 * DAY).toISOString();

  type Profile = {
    id: string;
    email: string | null;
    full_name: string | null;
    created_at: string;
    marketing_opt_out: boolean;
    growth_token: string;
    signup_landing?: string | null;
    signup_referrer?: string | null;
    signup_utm?: Record<string, unknown> | null;
  };
  const BASE = "id,email,full_name,created_at,marketing_opt_out,growth_token";
  let profiles: Profile[];
  try {
    profiles = await all<Profile>((a, b) => admin.from("profiles").select(`${BASE},signup_landing,signup_referrer,signup_utm`).order("created_at").range(a, b));
  } catch {
    // Before supabase/growth-attribution.sql runs, the columns don't exist.
    profiles = await all<Profile>((a, b) => admin.from("profiles").select(BASE).order("created_at").range(a, b));
  }
  const subs = await all<{ user_id: string; plan: string; status: string }>((a, b) =>
    admin.from("subscriptions").select("user_id,plan,status").range(a, b),
  );
  const events = await all<{ user_id: string; event: string; plan: string | null; billing: string | null; ref: string | null; meta: Record<string, unknown> | null; created_at: string }>((a, b) =>
    admin.from("growth_events").select("user_id,event,plan,billing,ref,meta,created_at").gte("created_at", since90).order("created_at", { ascending: false }).range(a, b),
  );
  const emails = await all<{ user_id: string; template: string; ref: string; created_at: string }>((a, b) =>
    admin.from("growth_emails").select("user_id,template,ref,created_at").eq("status", "sent").order("created_at", { ascending: false }).range(a, b),
  );
  // audit_events is optional (older databases may not have it) — treat as no activity.
  let audit: { user_id: string; action: string; created_at: string }[] = [];
  try {
    audit = await all((a, b) => admin.from("audit_events").select("user_id,action,created_at").gte("created_at", since30).not("user_id", "is", null).range(a, b));
  } catch {
    audit = [];
  }

  const subBy = new Map(subs.map((s) => [s.user_id, s]));
  const group = <T extends { user_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) (m.get(r.user_id) ?? m.set(r.user_id, []).get(r.user_id)!).push(r);
    return m;
  };
  const evBy = group(events);
  const mailBy = group(emails);
  const actBy = group(audit.filter((r) => !ACTIVITY_EXCLUDE.has(r.action)));

  return profiles.map((p) => {
    const sub = subBy.get(p.id);
    const acts = actBy.get(p.id) ?? [];
    const email = p.email ?? "";
    return {
      userId: p.id,
      email,
      name: p.full_name,
      token: p.growth_token,
      signedUpAt: Date.parse(p.created_at),
      plan: sub && PAID.has(sub.status) ? sub.plan : "free",
      paid: !!sub && sub.plan !== "free" && PAID.has(sub.status),
      comped: isAdminEmail(email) || isPartnerEmail(email),
      optOut: !!p.marketing_opt_out,
      events: (evBy.get(p.id) ?? []).map((e) => ({ event: e.event, plan: e.plan, billing: e.billing, ref: e.ref, meta: e.meta, at: Date.parse(e.created_at) })),
      attribution: {
        landing: p.signup_landing ?? null,
        referrer: p.signup_referrer ?? null,
        utmSource: (p.signup_utm?.utm_source as string | undefined) ?? null,
      },
      activity: acts.length,
      lastActivityAt: acts.length ? Math.max(...acts.map((a) => Date.parse(a.created_at))) : null,
      emails: (mailBy.get(p.id) ?? []).map((e) => ({ template: e.template, ref: e.ref, at: Date.parse(e.created_at) })),
    };
  });
}

export async function getMode(admin: Admin): Promise<AutopilotMode> {
  const { data, error } = await admin.from("growth_settings").select("mode").eq("id", 1).maybeSingle();
  if (error) throw new GrowthSetupError(error.message);
  return (data?.mode as AutopilotMode) ?? "dry_run";
}

export interface RunResult {
  mode: AutopilotMode;
  accounts: number;
  decisions: number;
  sent: number;
  failed: number;
  dryRun: number;
  hotLeads: number;
  digestSent: boolean;
  actions: { email: string; template: string; reason: string; status: string }[];
}

export async function runAutopilot(opts: { trigger: string; now?: number } = { trigger: "cron" }): Promise<RunResult> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new GrowthSetupError("Supabase service role not configured.");
  const now = opts.now ?? Date.now();
  const mode = await getMode(admin);

  const result: RunResult = { mode, accounts: 0, decisions: 0, sent: 0, failed: 0, dryRun: 0, hotLeads: 0, digestSent: false, actions: [] };

  if (mode !== "off") {
    const accounts = await loadAccounts(admin, now);
    result.accounts = accounts.length;
    const cap = Number(process.env.GROWTH_MAX_EMAILS_PER_RUN) || 50;
    const assessed = accounts.map((a) => ({ a, x: assess(a, now) }));
    // Highest intent first, so the cap (if hit) drops the least valuable sends.
    assessed.sort((p, q) => q.x.score - p.x.score);

    for (const { a, x } of assessed) {
      if (!x.next) continue;
      if (result.decisions >= cap) break;
      result.decisions++;
      let status: "sent" | "failed" | "dry_run" = "dry_run";
      if (mode === "live") {
        const { subject, html } = renderEmail({ decision: x.next, name: a.name, token: a.token });
        status = (await sendEmail(a.email, subject, html)) ? "sent" : "failed";
      }
      await admin
        .from("growth_emails")
        .upsert(
          { user_id: a.userId, email: a.email, template: x.next.template, ref: x.next.ref, status, score: x.score },
          { onConflict: "user_id,template,ref,status", ignoreDuplicates: true },
        );
      if (status === "sent") result.sent++;
      else if (status === "failed") result.failed++;
      else result.dryRun++;
      result.actions.push({ email: a.email, template: x.next.template, reason: x.next.reason, status });
    }

    // Digest: hot, unpaid, and active in the last 3 days — fresh enough to act on.
    const hot = assessed.filter(({ a, x }) => isDigestWorthy(a, x, now));
    result.hotLeads = hot.length;
    const to = adminEmails();
    if (hot.length && to.length) {
      const leads: DigestLead[] = hot.slice(0, 25).map(({ a, x }) => ({
        email: a.email,
        score: x.score,
        stage: x.stage,
        signals: x.signals,
        action: x.next ? `${mode === "live" ? "Emailed" : "Would email"}: ${TEMPLATE_LABELS[x.next.template]}` : "No automated email — reach out personally",
      }));
      const summary = `${mode === "live" ? "Live" : "Dry run"} · ${result.accounts} accounts checked · ${result.sent} sent · ${result.dryRun} would send`;
      const { subject, html } = renderDigest(leads, summary);
      result.digestSent = await sendEmail(to, subject, html);
    }
  }

  await admin
    .from("growth_settings")
    .update({ last_run_at: new Date(now).toISOString(), last_run: { ...result, trigger: opts.trigger, actions: result.actions.slice(0, 50) } })
    .eq("id", 1);
  return result;
}

function isDigestWorthy(a: LoadedAccount, x: Assessment, now: number): boolean {
  if (a.paid || a.comped || x.tier !== "hot") return false;
  const last = Math.max(a.events[0]?.at ?? 0, a.lastActivityAt ?? 0);
  return now - last <= 3 * DAY;
}
