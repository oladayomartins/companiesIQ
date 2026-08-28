// ============================================================
// Public API keys — issue, verify, meter.
//
// Keys are stored as a SHA-256 hash. The plaintext exists only in the response
// that creates it: a leaked database must not yield working credentials, and
// "show it once" is the only way to mean that.
//
// Quota is per calendar month per KEY, counted by an atomic SQL increment
// rather than read-modify-write in JS — under concurrency the naive version
// undercounts, which is precisely when a quota is load-bearing.
// ============================================================
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isAdminEmail, isPartnerEmail } from "@/lib/admin";
import { getUserPlanById } from "@/lib/access";
import { planById, type PlanId } from "@/lib/subscription";
import { API_QUOTAS } from "@/lib/api-quotas";

export { API_QUOTAS };

const PREFIX = "ciq_live_";

export interface ApiKeyRow {
  id: string;
  name: string | null;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const currentMonth = () => new Date().toISOString().slice(0, 7);

/** Issue a key. The plaintext is returned ONCE and never persisted. */
export async function createApiKey(
  userId: string,
  name: string | null,
  userEmail: string | null
): Promise<{ key: string; row: ApiKeyRow } | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const secret = randomBytes(24).toString("base64url");
  const key = `${PREFIX}${secret}`;
  const { data, error } = await admin
    .from("api_keys")
    .insert({
      user_id: userId,
      name: name?.trim().slice(0, 60) || null,
      key_hash: sha256(key),
      key_prefix: key.slice(0, 12),
      user_email: userEmail,
    })
    .select("id,name,key_prefix,created_at,last_used_at")
    .single();
  if (error || !data) return null;
  return { key, row: data as ApiKeyRow };
}

export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data } = await admin
    .from("api_keys")
    .select("id,name,key_prefix,created_at,last_used_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as ApiKeyRow[];
}

/** Soft-revoke, so usage history survives for billing and support. */
export async function revokeApiKey(userId: string, id: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  const { error } = await admin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

export type AuthResult =
  | { ok: true; keyId: string; userId: string; used: number; quota: number }
  | { ok: false; status: 401 | 403 | 429; error: string };

/**
 * Authenticate a request and count it.
 *
 * Order matters: identity, then entitlement, then quota. A revoked key must not
 * reveal whether the owner's plan allows the API, and an over-quota caller must
 * get 429 rather than a confusing 403.
 */
export async function authenticateApiRequest(req: Request): Promise<AuthResult> {
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
  const key = bearer || req.headers.get("x-api-key")?.trim() || "";
  if (!key.startsWith(PREFIX)) {
    return { ok: false, status: 401, error: "Provide an API key as 'Authorization: Bearer ciq_live_…'." };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, status: 403, error: "API is not configured." };

  const { data: row } = await admin
    .from("api_keys")
    .select("id,user_id,revoked_at,user_email")
    .eq("key_hash", sha256(key))
    .maybeSingle();
  if (!row || row.revoked_at) return { ok: false, status: 401, error: "Invalid or revoked API key." };

  const userId = row.user_id as string;
  const keyId = row.id as string;

  // Entitlement is read from the plan, not baked into the key, so a downgrade
  // takes effect immediately rather than at the next key rotation.
  //
  // Comped accounts (admin / partner) are honoured here too. /api/keys lets them
  // create a key, so refusing it at call time would hand them a credential that
  // never works.
  const email = (row.user_email as string | null) ?? null;
  const comped = isAdminEmail(email) || isPartnerEmail(email);
  const plan = await getUserPlanById(userId);
  const caps = planById(plan as PlanId).caps;
  const quota = comped ? API_QUOTAS.enterprise : API_QUOTAS[plan] ?? 0;
  if (!comped && (!caps.api || quota === 0)) {
    return { ok: false, status: 403, error: "API access is available on the Team and Enterprise plans." };
  }

  const { data: used } = await admin.rpc("record_api_call", { p_key_id: keyId, p_month: currentMonth() });
  const calls = typeof used === "number" ? used : 0;
  if (calls > quota) {
    return { ok: false, status: 429, error: `Monthly quota of ${quota.toLocaleString("en-GB")} calls reached.` };
  }

  // Best-effort; never fail a good request because the timestamp did not write.
  void admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyId);

  return { ok: true, keyId, userId, used: calls, quota };
}

/** Standard rate headers, so a client can back off without guessing. */
export function quotaHeaders(used: number, quota: number): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(quota),
    "X-RateLimit-Remaining": String(Math.max(0, quota - used)),
    "X-RateLimit-Reset": `${currentMonth()}-01`,
  };
}
