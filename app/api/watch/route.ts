// Watch / unwatch a company (the report "Watch" toggle).
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { addWatch, removeWatch } from "@/lib/watchlist";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { companyNumber?: string };
  if (!body.companyNumber) return NextResponse.json({ error: "companyNumber required." }, { status: 400 });
  const ok = await addWatch(body.companyNumber);
  return ok ? NextResponse.json({ ok: true, watched: true }) : NextResponse.json({ error: "Could not watch." }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const number = new URL(req.url).searchParams.get("number");
  if (!number) return NextResponse.json({ error: "number required." }, { status: 400 });
  const ok = await removeWatch(number);
  return ok ? NextResponse.json({ ok: true, watched: false }) : NextResponse.json({ error: "Could not unwatch." }, { status: 400 });
}
