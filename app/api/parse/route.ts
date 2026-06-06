// Parse a plain-English company-search phrase into structured filters.
// Rule-based by default; uses Claude when ANTHROPIC_API_KEY is set.
import { NextRequest, NextResponse } from "next/server";
import { parseQuery } from "@/lib/nl-search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const parsed = q.trim() ? await parseQuery(q) : null;
  return NextResponse.json({ parsed });
}
