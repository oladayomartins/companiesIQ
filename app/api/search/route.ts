import { NextRequest, NextResponse } from "next/server";
import { search, explore } from "@/lib/data";
import { aggregateKeywords } from "@/lib/keywords";

export const dynamic = "force-dynamic";

function isoFromWindow(win: string | null): string | undefined {
  if (!win || win === "any") return undefined;
  const d = new Date();
  if (win === "12m") d.setMonth(d.getMonth() - 12);
  else if (win === "5y") d.setFullYear(d.getFullYear() - 5);
  else return undefined;
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const statuses = sp.getAll("status");
  const sics = sp.getAll("sic");
  const region = sp.get("region") || undefined;
  const incorporatedFrom = isoFromWindow(sp.get("incorporated"));
  const startIndex = Number(sp.get("start") || 0) || 0;

  const hasFacets = statuses.length > 0 || sics.length > 0 || !!region || !!incorporatedFrom || startIndex > 0;

  try {
    let result;
    if (q && !hasFacets) {
      result = await search(q);
    } else {
      result = await explore({
        q: q || undefined,
        status: statuses.length ? statuses : undefined,
        sicCodes: sics.length ? sics : undefined,
        region,
        incorporatedFrom,
        size: 40,
        startIndex,
      });
    }
    const keywords = aggregateKeywords(result.results).slice(0, 12);
    return NextResponse.json({ ...result, keywords });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed", total: 0, results: [], live: false, keywords: [] },
      { status: 502 }
    );
  }
}
