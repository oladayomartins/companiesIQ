// Data access for the segmented /company/* sitemap. Company URLs are sourced
// from the Supabase `companies` table (populated by the ingestion worker), so
// the sitemap grows with coverage. Degrades to empty when Supabase isn't
// configured/reachable — the index simply lists no company chunks.
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Sitemaps allow up to 50,000 URLs each; stay comfortably under.
export const SITEMAP_CHUNK = 45000;

export async function companyCount(): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin) return 0;
  try {
    const { count } = await admin.from("companies").select("number", { count: "exact", head: true });
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function companyChunk(id: number): Promise<{ number: string; updated_at: string | null }[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  try {
    const from = id * SITEMAP_CHUNK;
    const { data } = await admin
      .from("companies")
      .select("number, updated_at")
      .order("number", { ascending: true })
      .range(from, from + SITEMAP_CHUNK - 1);
    return data ?? [];
  } catch {
    return [];
  }
}
