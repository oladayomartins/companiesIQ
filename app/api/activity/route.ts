// The signed-in user's own audit trail. Scoped to the caller by construction —
// there is no parameter to widen it, so one account can never read another's.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { recentAuditForUser } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({ events: await recentAuditForUser(user.id, 50) });
}
