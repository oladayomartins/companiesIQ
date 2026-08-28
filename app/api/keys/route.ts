// Key management for the signed-in user (the Settings screen calls this).
// Session-authenticated, unlike /api/v1/* which is key-authenticated.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/access";
import { planById, type PlanId } from "@/lib/subscription";
import { isAdmin, isPartner } from "@/lib/admin";
import { createApiKey, listApiKeys, revokeApiKey, API_QUOTAS } from "@/lib/api-keys";
import { audit } from "@/lib/audit";
import type { User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const MAX_KEYS = 5;

async function canUseApi(user: User): Promise<boolean> {
  if (isAdmin(user) || isPartner(user)) return true;
  return planById((await getUserPlan(user)) as PlanId).caps.api;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const plan = await getUserPlan(user);
  return NextResponse.json({
    keys: await listApiKeys(user.id),
    quota: API_QUOTAS[plan] ?? 0,
    entitled: await canUseApi(user),
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await canUseApi(user))) {
    return NextResponse.json({ error: "API access is available on the Team and Enterprise plans." }, { status: 403 });
  }
  if ((await listApiKeys(user.id)).length >= MAX_KEYS) {
    return NextResponse.json({ error: `You can hold up to ${MAX_KEYS} active keys. Revoke one first.` }, { status: 409 });
  }

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const created = await createApiKey(user.id, body.name ?? null, user.email ?? null);
  if (!created) return NextResponse.json({ error: "Could not create key." }, { status: 500 });

  await audit({
    userId: user.id,
    actorEmail: user.email ?? null,
    action: "api.key.create",
    subject: created.row.id,
    meta: { prefix: created.row.key_prefix, name: created.row.name },
    req,
  });

  // The only time the plaintext ever leaves the server.
  return NextResponse.json({ ok: true, key: created.key, row: created.row });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await revokeApiKey(user.id, id);
  if (ok) {
    await audit({ userId: user.id, actorEmail: user.email ?? null, action: "api.key.revoke", subject: id, req });
  }
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Could not revoke." }, { status: 400 });
}
