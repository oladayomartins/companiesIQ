// ============================================================
// Research pipeline — persistence
// ------------------------------------------------------------
// Three things are stored per run: the dataset (so the published
// figures can be re-served as CSV and as Dataset structured data
// long after the run), the article (the existing `posts` table),
// and a run log (so an unattended pipeline can be audited — what
// ran, what it decided, and why).
//
// Datasets are aggregates: a few hundred rows of counts per
// edition, not company records. Storage cost is negligible.
// ============================================================
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Dataset, PostDraft } from "./types";
import type { Issue } from "./validate";

export async function saveDataset(d: Dataset): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase service role is not configured.");
  const { error } = await admin.from("research_datasets").upsert(
    {
      slug: d.slug,
      study: d.study,
      period_id: d.period.id,
      title: d.title,
      payload: d,
      generated_at: d.generatedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );
  if (error) throw new Error(`saveDataset: ${error.message}`);
}

export async function getDataset(slug: string): Promise<Dataset | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin.from("research_datasets").select("payload").eq("slug", slug).maybeSingle();
  return (data?.payload as Dataset) ?? null;
}

export async function listDatasetSlugs(): Promise<string[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data } = await admin.from("research_datasets").select("slug");
  return ((data ?? []) as { slug: string }[]).map((r) => r.slug);
}

/**
 * Upsert the article by slug. An existing post keeps its original
 * `published_at` — a refreshed edition is the same article with new figures,
 * not a new publication date, and back-dating or re-dating it would misstate
 * the record.
 */
export async function upsertResearchPost(
  draft: PostDraft,
  opts: { status: "draft" | "published"; author: string; coverImage?: string | null }
): Promise<{ created: boolean }> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase service role is not configured.");
  const { data: existing } = await admin.from("posts").select("id, published_at, status").eq("slug", draft.slug).maybeSingle();
  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    slug: draft.slug,
    title: draft.title,
    excerpt: draft.excerpt,
    meta_description: draft.meta_description,
    body_md: draft.body_md,
    faq: draft.faq,
    related: draft.related,
    author: opts.author,
    status: opts.status,
    updated_at: now,
    published_at: (existing?.published_at as string | null) ?? (opts.status === "published" ? now : null),
  };
  if (opts.coverImage !== undefined) row.cover_image = opts.coverImage;
  const { error } = await admin.from("posts").upsert(row, { onConflict: "slug" });
  if (error) throw new Error(`upsertResearchPost: ${error.message}`);
  return { created: !existing };
}

export interface RunLog {
  study: string;
  period_id: string;
  slug: string;
  status: "published" | "drafted" | "failed";
  issues: Issue[];
  api_calls: number;
  duration_ms: number;
  error?: string | null;
}

export async function logRun(entry: RunLog): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin.from("research_runs").insert({ ...entry, issues: entry.issues, created_at: new Date().toISOString() });
}

/** The most recent run for a slug — lets the scheduler skip work already done. */
export async function lastRun(slug: string): Promise<{ status: string; created_at: string } | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from("research_runs")
    .select("status, created_at")
    .eq("slug", slug)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { status: string; created_at: string } | null) ?? null;
}
