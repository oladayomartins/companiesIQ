// Prospect list items — add (POST) and remove (DELETE).
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { addProspect, removeProspect } from "@/lib/prospects";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    listId?: string;
    listName?: string;
    companyNumber?: string;
    companyName?: string;
    sector?: string;
    region?: string;
    score?: number;
  };
  if (!body.companyNumber) return NextResponse.json({ error: "companyNumber required." }, { status: 400 });
  const res = await addProspect({
    listId: body.listId,
    listName: body.listName,
    company: {
      number: body.companyNumber,
      name: body.companyName,
      sector: body.sector,
      region: body.region,
      score: typeof body.score === "number" ? body.score : null,
    },
  });
  if (!res.ok) return NextResponse.json({ error: "Could not add to list." }, { status: 400 });
  return NextResponse.json({ ok: true, listId: res.listId });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const listId = searchParams.get("listId");
  const number = searchParams.get("number");
  if (!listId || !number) return NextResponse.json({ error: "listId and number required." }, { status: 400 });
  const ok = await removeProspect(listId, number);
  return NextResponse.json({ ok });
}
