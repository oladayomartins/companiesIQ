// Export a prospect list as a CSV download.
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getProspectList, itemsToCsv } from "@/lib/prospects";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const listId = searchParams.get("listId");
  if (!listId) return NextResponse.json({ error: "listId required." }, { status: 400 });
  const data = await getProspectList(listId);
  if (!data) return NextResponse.json({ error: "List not found." }, { status: 404 });

  const csv = itemsToCsv(data.list.name, data.items);
  const filename = `${data.list.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "prospects"}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
