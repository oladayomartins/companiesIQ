// Blog post data access. Public reads return only published posts; admin reads
// and all writes go through the service-role client (RLS-locked table).
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface FaqItem {
  q: string;
  a: string;
}
export interface RelatedLink {
  label: string;
  href: string;
}
export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  meta_description: string | null;
  cover_image: string | null;
  faq: FaqItem[];
  related: RelatedLink[];
  status: "draft" | "published";
  published_at: string | null;
  author: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostInput {
  id?: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  body_md: string;
  meta_description?: string | null;
  cover_image?: string | null;
  faq?: FaqItem[];
  related?: RelatedLink[];
  status?: "draft" | "published";
  author?: string | null;
  published_at?: string | null;
}

function normalize(row: Record<string, unknown> | null): Post | null {
  if (!row) return null;
  const r = row as unknown as Post;
  return {
    ...r,
    faq: Array.isArray(row.faq) ? (row.faq as FaqItem[]) : [],
    related: Array.isArray(row.related) ? (row.related as RelatedLink[]) : [],
  };
}

// ---- Public reads (published only) ----
export async function getPublishedPosts(): Promise<Post[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data } = await admin
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => normalize(r)!).filter(Boolean);
}

export async function getPublishedPostBySlug(slug: string): Promise<Post | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin.from("posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return normalize(data as Record<string, unknown> | null);
}

export async function getPublishedSlugs(): Promise<string[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data } = await admin.from("posts").select("slug").eq("status", "published");
  return ((data ?? []) as { slug: string }[]).map((r) => r.slug);
}

// ---- Admin reads / writes (service role) ----
export async function listAllPosts(): Promise<Post[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data } = await admin.from("posts").select("*").order("updated_at", { ascending: false });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => normalize(r)!).filter(Boolean);
}

export async function getPostById(id: string): Promise<Post | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin.from("posts").select("*").eq("id", id).maybeSingle();
  return normalize(data as Record<string, unknown> | null);
}

export async function upsertPost(input: PostInput): Promise<Post | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt ?? null,
    body_md: input.body_md,
    meta_description: input.meta_description ?? null,
    cover_image: input.cover_image ?? null,
    faq: input.faq ?? [],
    related: input.related ?? [],
    status: input.status ?? "draft",
    author: input.author ?? null,
    updated_at: now,
  };
  if (input.id) row.id = input.id;
  // Preserve an explicit published_at if provided; otherwise stamp now only
  // when publishing (the route passes the existing value to avoid resetting).
  if (input.published_at !== undefined) row.published_at = input.published_at;
  else if ((input.status ?? "draft") === "published") row.published_at = now;
  const { data, error } = await admin.from("posts").upsert(row, { onConflict: "id" }).select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return normalize(data as Record<string, unknown> | null);
}

export async function deletePost(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin.from("posts").delete().eq("id", id);
}
