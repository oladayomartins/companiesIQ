// ============================================================
// Prospect lists — the lead-qualification workflow. User-owned lists of
// companies saved from the Opportunity Intelligence view, exportable to CSV.
// RLS-scoped (auth.uid()) via the SSR client; degrades to empty when Supabase
// isn't configured or the user isn't signed in.
// ============================================================
import "server-only";
import { getSupabaseServer, getCurrentUser } from "@/lib/supabase/server";

export interface ProspectList {
  id: string;
  name: string;
  createdAt: string;
  count: number;
}

export interface ProspectItem {
  companyNumber: string;
  companyName: string | null;
  sector: string | null;
  region: string | null;
  score: number | null;
  note: string | null;
  addedAt: string;
}

export interface ProspectCompany {
  number: string;
  name?: string | null;
  sector?: string | null;
  region?: string | null;
  score?: number | null;
}

/** All of the signed-in user's lists, newest first, with item counts. */
export async function getProspectLists(): Promise<ProspectList[]> {
  const sb = await getSupabaseServer();
  const user = await getCurrentUser();
  if (!sb || !user) return [];
  const { data, error } = await sb
    .from("prospect_lists")
    .select("id,name,created_at,prospect_list_items(count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((l) => ({
    id: l.id as string,
    name: l.name as string,
    createdAt: l.created_at as string,
    count: countOf(l.prospect_list_items),
  }));
}

/** One list plus its items (RLS guarantees ownership). */
export async function getProspectList(id: string): Promise<{ list: ProspectList; items: ProspectItem[] } | null> {
  const sb = await getSupabaseServer();
  const user = await getCurrentUser();
  if (!sb || !user) return null;
  const { data: list } = await sb
    .from("prospect_lists")
    .select("id,name,created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!list) return null;
  const { data: rows } = await sb
    .from("prospect_list_items")
    .select("company_number,company_name,sector,region,score,note,added_at")
    .eq("list_id", id)
    .order("added_at", { ascending: false });
  const items: ProspectItem[] = (rows ?? []).map((r) => ({
    companyNumber: r.company_number as string,
    companyName: (r.company_name as string) ?? null,
    sector: (r.sector as string) ?? null,
    region: (r.region as string) ?? null,
    score: (r.score as number) ?? null,
    note: (r.note as string) ?? null,
    addedAt: r.added_at as string,
  }));
  return { list: { id: list.id as string, name: list.name as string, createdAt: list.created_at as string, count: items.length }, items };
}

export async function createProspectList(name: string): Promise<ProspectList | null> {
  const sb = await getSupabaseServer();
  const user = await getCurrentUser();
  if (!sb || !user) return null;
  const clean = name.trim().slice(0, 120) || "Untitled list";
  const { data } = await sb.from("prospect_lists").insert({ user_id: user.id, name: clean }).select("id,name,created_at").maybeSingle();
  if (!data) return null;
  return { id: data.id as string, name: data.name as string, createdAt: data.created_at as string, count: 0 };
}

export async function deleteProspectList(id: string): Promise<boolean> {
  const sb = await getSupabaseServer();
  const user = await getCurrentUser();
  if (!sb || !user) return false;
  const { error } = await sb.from("prospect_lists").delete().eq("id", id).eq("user_id", user.id);
  return !error;
}

/**
 * Add a company to a list. Resolves the target list in priority order:
 * an explicit listId → a list matching listName → create from listName →
 * the user's most-recent list → a fresh "My prospects". Idempotent on
 * (list, company).
 */
export async function addProspect(input: {
  listId?: string;
  listName?: string;
  company: ProspectCompany;
}): Promise<{ ok: boolean; listId?: string }> {
  const sb = await getSupabaseServer();
  const user = await getCurrentUser();
  if (!sb || !user || !input.company?.number) return { ok: false };

  let listId = input.listId;

  if (!listId && input.listName) {
    const name = input.listName.trim();
    const { data: existing } = await sb.from("prospect_lists").select("id").eq("user_id", user.id).ilike("name", name).maybeSingle();
    listId = (existing?.id as string) ?? (await createProspectList(name))?.id;
  }
  if (!listId) {
    const { data: recent } = await sb.from("prospect_lists").select("id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    listId = (recent?.id as string) ?? (await createProspectList("My prospects"))?.id;
  }
  if (!listId) return { ok: false };

  // Ownership is enforced by RLS on insert (check policy joins to the list).
  const { error } = await sb.from("prospect_list_items").upsert(
    {
      list_id: listId,
      company_number: input.company.number,
      company_name: input.company.name ?? null,
      sector: input.company.sector ?? null,
      region: input.company.region ?? null,
      score: input.company.score ?? null,
    },
    { onConflict: "list_id,company_number" }
  );
  return { ok: !error, listId };
}

export async function removeProspect(listId: string, companyNumber: string): Promise<boolean> {
  const sb = await getSupabaseServer();
  const user = await getCurrentUser();
  if (!sb || !user) return false;
  // RLS scopes the delete to lists the user owns.
  const { error } = await sb.from("prospect_list_items").delete().eq("list_id", listId).eq("company_number", companyNumber);
  return !error;
}

/** CSV (RFC-4180-ish) for a list export. */
export function itemsToCsv(listName: string, items: ProspectItem[]): string {
  const esc = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["Company name", "Company number", "Sector", "Region", "Opportunity score", "Added"];
  const lines = items.map((i) =>
    [i.companyName, i.companyNumber, i.sector, i.region, i.score, i.addedAt?.slice(0, 10)].map(esc).join(",")
  );
  return [`# ${listName}`, header.join(","), ...lines].join("\n");
}

function countOf(rel: unknown): number {
  // Supabase returns an aggregate relation as [{ count: n }].
  if (Array.isArray(rel) && rel[0] && typeof (rel[0] as { count?: number }).count === "number") {
    return (rel[0] as { count: number }).count;
  }
  return 0;
}
