// Admin blog write API. Create or update a post (upsert). Admin-only.
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { upsertPost, getPostById, type PostInput } from "@/lib/posts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as PostInput;
  if (!body.title || !body.slug) {
    return NextResponse.json({ error: "Title and slug are required." }, { status: 400 });
  }

  // Preserve published_at across edits; stamp it only on the draft→published transition.
  const existing = body.id ? await getPostById(body.id) : null;
  let published_at: string | null | undefined = body.published_at;
  if (published_at === undefined) {
    if (body.status === "published") {
      published_at = existing?.published_at ?? new Date().toISOString();
    } else {
      published_at = existing?.published_at ?? null;
    }
  }

  try {
    // Keep the existing byline on edit — the editor doesn't send one, and
    // falling back to the editor's email silently re-attributed old posts.
    const author = body.author ?? existing?.author ?? "CompaniesIQ Research";
    const post = await upsertPost({ ...body, author, published_at });
    return NextResponse.json({ post });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Save failed." }, { status: 400 });
  }
}
