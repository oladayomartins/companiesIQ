// Alerts CRUD. Persists to Supabase when configured + authenticated;
// otherwise reports unconfigured so the client falls back to local
// (demo) storage. Keeps the product usable end-to-end without setup.
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer, getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/server";
import { canUseAlerts } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ configured: false, alerts: [] });
  const supabase = await getSupabaseServer();
  const user = await getCurrentUser();
  if (!supabase || !user) return NextResponse.json({ configured: true, authed: false, alerts: [] });
  const { data, error } = await supabase.from("alerts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ configured: true, authed: true, alerts: [], error: error.message });
  return NextResponse.json({ configured: true, authed: true, alerts: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!isSupabaseConfigured()) return NextResponse.json({ configured: false }, { status: 200 });
  const supabase = await getSupabaseServer();
  const user = await getCurrentUser();
  if (!supabase || !user) return NextResponse.json({ configured: true, authed: false }, { status: 401 });
  // The page gate is not enough on its own — creating an alert has to be
  // authorised here, or a free account can just POST to this route.
  if (!(await canUseAlerts(user))) {
    return NextResponse.json({ error: "Alerts are available on the Team and Enterprise plans." }, { status: 403 });
  }
  const { data, error } = await supabase
    .from("alerts")
    .insert({
      user_id: user.id,
      name: body.name,
      sector: body.sector ?? null,
      sic: body.sic ?? null,
      region: body.region ?? null,
      status: body.status ?? [],
      channel: body.channel ?? "webhook",
      destination: body.destination ?? "",
      active: true,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alert: data });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ configured: false });
  const supabase = await getSupabaseServer();
  const user = await getCurrentUser();
  if (!supabase || !user) return NextResponse.json({ authed: false }, { status: 401 });
  const { error } = await supabase.from("alerts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
