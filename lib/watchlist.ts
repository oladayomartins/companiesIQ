// Watchlist membership for the report "Watch" toggle. RLS-scoped via the SSR
// client, so every query is automatically limited to the signed-in user's own
// lists. A user's first watchlist ("Watchlist") is created on demand.
import "server-only";
import { getSupabaseServer, getSupabaseAdmin, getCurrentUser } from "@/lib/supabase/server";
import { watchlistLimit, WATCHLIST_COMPANY_LIMIT } from "@/lib/access";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface WatchedCompany {
  number: string;
  name: string | null;
  sector: string | null;
  region: string | null;
  addedAt: string;
}

async function defaultListId(sb: SupabaseClient, userId: string): Promise<string | null> {
  const { data: existing } = await sb
    .from("watchlists")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;
  const { data: created } = await sb.from("watchlists").insert({ user_id: userId, name: "Watchlist" }).select("id").maybeSingle();
  return (created?.id as string) ?? null;
}

/** Is this company in any of the signed-in user's watchlists? */
export async function isWatched(companyNumber: string): Promise<boolean> {
  const sb = await getSupabaseServer();
  const user = await getCurrentUser();
  if (!sb || !user) return false;
  // RLS scopes watchlist_companies to the user's own lists.
  const { data } = await sb.from("watchlist_companies").select("company_number").eq("company_number", companyNumber).limit(1);
  return (data?.length ?? 0) > 0;
}

/** The signed-in user's watched companies, newest first, with names/sector/
 *  region resolved from the register cache where available. */
export async function getWatchedCompanies(): Promise<WatchedCompany[]> {
  const sb = await getSupabaseServer();
  const user = await getCurrentUser();
  if (!sb || !user) return [];
  const { data: rows } = await sb
    .from("watchlist_companies")
    .select("company_number,added_at")
    .order("added_at", { ascending: false });
  const numbers = (rows ?? []).map((r) => r.company_number as string);
  if (!numbers.length) return [];

  const meta = new Map<string, { name: string | null; primary_sector: string | null; region: string | null }>();
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data } = await admin.from("companies").select("number,name,primary_sector,region").in("number", numbers);
    for (const c of data ?? []) meta.set(c.number as string, c);
  }
  return (rows ?? []).map((r) => {
    const m = meta.get(r.company_number as string);
    return {
      number: r.company_number as string,
      name: m?.name ?? null,
      sector: m?.primary_sector ?? null,
      region: m?.region ?? null,
      addedAt: r.added_at as string,
    };
  });
}

export type WatchResult = { ok: true } | { ok: false; reason: "auth" | "limit" };

/**
 * Add a company to the user's default watchlist.
 *
 * Enforces the per-plan company limit the pricing page advertises. Analyst is
 * sold as "1 watchlist · 50 companies"; without this, it was unlimited, which
 * made the Team upgrade meaningless.
 */
export async function addWatchChecked(companyNumber: string): Promise<WatchResult> {
  const sb = await getSupabaseServer();
  const user = await getCurrentUser();
  if (!sb || !user) return { ok: false, reason: "auth" };
  const listId = await defaultListId(sb, user.id);
  if (!listId) return { ok: false, reason: "auth" };

  const limit = await watchlistLimit(user);
  if (limit !== -1) {
    const { count } = await sb
      .from("watchlist_companies")
      .select("company_number", { count: "exact", head: true })
      .eq("watchlist_id", listId);
    // Already-watched companies are an upsert, not a new row, so they must not
    // be refused once the list is full.
    const already = await isWatched(companyNumber);
    if (!already && (count ?? 0) >= WATCHLIST_COMPANY_LIMIT) return { ok: false, reason: "limit" };
  }

  const { error } = await sb
    .from("watchlist_companies")
    .upsert({ watchlist_id: listId, company_number: companyNumber }, { onConflict: "watchlist_id,company_number" });
  return error ? { ok: false, reason: "auth" } : { ok: true };
}

export async function addWatch(companyNumber: string): Promise<boolean> {
  const sb = await getSupabaseServer();
  const user = await getCurrentUser();
  if (!sb || !user) return false;
  const listId = await defaultListId(sb, user.id);
  if (!listId) return false;
  const { error } = await sb
    .from("watchlist_companies")
    .upsert({ watchlist_id: listId, company_number: companyNumber }, { onConflict: "watchlist_id,company_number" });
  return !error;
}

export async function removeWatch(companyNumber: string): Promise<boolean> {
  const sb = await getSupabaseServer();
  const user = await getCurrentUser();
  if (!sb || !user) return false;
  // RLS scopes the delete to the user's own lists.
  const { error } = await sb.from("watchlist_companies").delete().eq("company_number", companyNumber);
  return !error;
}
