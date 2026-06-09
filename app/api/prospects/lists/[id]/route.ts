// Delete a prospect list (and its items via cascade).
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { deleteProspectList } from "@/lib/prospects";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const ok = await deleteProspectList(id);
  return NextResponse.json({ ok });
}
