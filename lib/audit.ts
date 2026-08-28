// ============================================================
// Audit log — append-only record of actions worth answering for.
//
// Two properties this has to hold:
//   1. It must NEVER break the thing it observes. Every write is best-effort
//      and swallowed: a customer's export must not fail because the audit
//      insert did. A missing audit row is a gap; a failed export is an outage.
//   2. It must survive the account. actor_email is denormalised and user_id is
//      ON DELETE SET NULL, so deleting a user does not erase the record of what
//      that user did — which is the whole point of keeping one.
// ============================================================
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type AuditAction =
  | "api.key.create"
  | "api.key.revoke"
  | "api.call"
  | "export.csv"
  | "contact.reveal"
  | "search.save"
  | "watch.add";

export interface AuditEntry {
  userId?: string | null;
  actorEmail?: string | null;
  action: AuditAction;
  subject?: string | null;
  meta?: Record<string, unknown> | null;
  /** Pass the request to capture the caller's IP where it matters. */
  req?: Request | null;
}

/** Client IP behind Vercel's proxy; the first hop is the real client. */
function clientIp(req?: Request | null): string | null {
  if (!req) return null;
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0]!.trim() : req.headers.get("x-real-ip");
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) return;
    await admin.from("audit_events").insert({
      user_id: entry.userId ?? null,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      subject: entry.subject ?? null,
      meta: entry.meta ?? null,
      ip: clientIp(entry.req),
    });
  } catch {
    // Deliberately silent. See note 1 above.
  }
}

export interface AuditRow {
  id: number;
  action: string;
  subject: string | null;
  created_at: string;
  meta: Record<string, unknown> | null;
}

/** A user's own trail, for Settings and for answering subject-access requests. */
export async function recentAuditForUser(userId: string, limit = 50): Promise<AuditRow[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data } = await admin
    .from("audit_events")
    .select("id,action,subject,created_at,meta")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AuditRow[];
}
