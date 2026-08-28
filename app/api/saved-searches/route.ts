// Saved searches — the retention hook on /search. A saved search is a query
// plus its filters; the landing page shows them so a returning user picks up
// where they left off rather than retyping.
//
// Gated on the plan's savedSearches cap (not hasProAccess) so the entitlement
// matches what pricing actually promises. Reads use the caller's own session
// via RLS ("own saved searches"); writes go through the service role because
// the cap check has already happened here.
import { NextResponse } from "next/server";
import { getCurrentUser, getSupabaseAdmin } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/access";
import { planById, type PlanId } from "@/lib/subscription";
import { isAdmin, isPartner } from "@/lib/admin";
import { audit } from "@/lib/audit";
import type { User } from "@supabase/supabase-js";

const MAX_SAVED = 50;

async function canSave(user: User): Promise<boolean> {
  if (isAdmin(user) || isPartner(user)) return true;
  return planById((await getUserPlan(user)) as PlanId).caps.savedSearches;
}

export interface SavedSearchQuery {
  q?: string;
  sector?: string;
  region?: string;
  place?: string;
  status?: string[];
  incorporated?: string;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ searches: [] });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ searches: [] });

  const { data } = await admin
    .from("saved_searches")
    .select("id,label,query,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_SAVED);

  return NextResponse.json({ searches: data ?? [] });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await canSave(user))) return NextResponse.json({ error: "Upgrade required" }, { status: 403 });

  let body: { label?: string; query?: SavedSearchQuery };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const query = body.query;
  if (!query || typeof query !== "object") return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  // Keep the list a working set, not an archive.
  const { count } = await admin
    .from("saved_searches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= MAX_SAVED) {
    return NextResponse.json({ error: `You can keep up to ${MAX_SAVED} saved searches` }, { status: 409 });
  }

  const label = (body.label ?? "").trim().slice(0, 120) || null;
  const { data, error } = await admin
    .from("saved_searches")
    .insert({ user_id: user.id, label, query })
    .select("id,label,query,created_at")
    .single();
  if (error) return NextResponse.json({ error: "Save failed" }, { status: 500 });

  await audit({
    userId: user.id,
    actorEmail: user.email ?? null,
    action: "search.save",
    subject: (data as { id?: string } | null)?.id ?? null,
    meta: { label },
    req,
  });

  return NextResponse.json({ ok: true, search: data });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  // Scoped to the caller's own rows — an id from someone else's list is a no-op.
  const { error } = await admin.from("saved_searches").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
