// Bulk-add companies to a prospect list (the search → save-many workflow).
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { addProspectsBulk, type ProspectCompany } from "@/lib/prospects";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    listId?: string;
    listName?: string;
    companies?: ProspectCompany[];
  };
  if (!Array.isArray(body.companies) || !body.companies.length) {
    return NextResponse.json({ error: "companies required." }, { status: 400 });
  }
  const res = await addProspectsBulk({ listId: body.listId, listName: body.listName, companies: body.companies });
  if (!res.ok) return NextResponse.json({ error: "Could not add to list." }, { status: 400 });
  return NextResponse.json({ ok: true, listId: res.listId, added: res.added });
}
