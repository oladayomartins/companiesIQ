// GET /api/market-summary?sector=&place=&region= → MarketSummary | null
// Public: counts of the public register (see lib/market-summary.ts). Cached
// server-side for 6h per (sector, location), so repeat views cost nothing.
import { NextRequest, NextResponse } from "next/server";
import { getMarketSummary } from "@/lib/market-summary";

export const dynamic = "force-dynamic";

const param = (v: string | null) => (v && v.trim() ? v.trim().slice(0, 80) : null);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const summary = await getMarketSummary({ sector: param(sp.get("sector")), place: param(sp.get("place")), region: param(sp.get("region")) });
  return NextResponse.json({ summary }, { headers: { "cache-control": "public, max-age=600" } });
}
