// Watchlist membership for the report "Watch" toggle. RLS-scoped via the SSR
// client, so every query is automatically limited to the signed-in user's own
// lists. A user's first watchlist ("Watchlist") is created on demand.
import "server-only";
import { getSupabaseServer, getCurrentUser } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

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
