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
  const from = id * SITEMAP_CHUNK;
  const to = from + SITEMAP_CHUNK - 1;

  // PostgREST caps a single response at 1,000 rows regardless of the range we
  // ask for, so `.range(0, 44999)` silently returned 1,000 and the sitemap
  // shipped a fraction of the register. Page through in explicit 1,000-row
  // reads until the chunk is filled or the table runs out.
  const PAGE = 1000;
  const rows: { number: string; updated_at: string | null }[] = [];
  try {
    for (let start = from; start <= to; start += PAGE) {
      const end = Math.min(start + PAGE - 1, to);
      const { data, error } = await admin
        .from("companies")
        .select("number, updated_at")
        .order("number", { ascending: true })
        .range(start, end);
      if (error) break;
      const batch = data ?? [];
      rows.push(...batch);
      // A short read means we have reached the end of the table.
      if (batch.length < end - start + 1) break;
    }
    return rows;
  } catch {
    // Return what we already have rather than dropping the whole sitemap.
    return rows;
  }
}
