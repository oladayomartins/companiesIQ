// Prospect lists — list (GET) and create (POST).
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getProspectLists, createProspectList } from "@/lib/prospects";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ lists: await getProspectLists() });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  if (!body.name?.trim()) return NextResponse.json({ error: "Name required." }, { status: 400 });
  const list = await createProspectList(body.name);
  if (!list) return NextResponse.json({ error: "Could not create list." }, { status: 400 });
  return NextResponse.json({ list });
}
