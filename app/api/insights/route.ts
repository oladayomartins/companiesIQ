// Insights — factual aggregates + natural-language company search.
// No opportunity score, no keyword themes. Aggregates are real:
// trending sectors (ONS), fastest-growing regions (Nomis), and live
// most-active regions / most-registered SIC from recent incorporations.
import { NextRequest, NextResponse } from "next/server";
import { explore } from "@/lib/data";
import { parseQuery } from "@/lib/nl-search";
import { fastestGrowingSectors, regionBreakdown } from "@/lib/analytics";
import { getActivityBreakdown } from "@/lib/live-stats";
import { REGION_STATS } from "@/lib/ons";
import { getRegionIndicators } from "@/lib/nomis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const parsed = q.trim() ? await parseQuery(q) : null;

  let results: Awaited<ReturnType<typeof explore>>["results"] = [];
  let live = true;
  if (parsed) {
    const r = await explore({
      q: parsed.name || undefined,
      region: parsed.region,
      sector: parsed.sector,
      status: parsed.status.length ? parsed.status : undefined,
      size: 40,
    });
    live = r.live;
    results = r.results;
  }

  const [activity, nomis] = await Promise.all([getActivityBreakdown(30).catch(() => null), getRegionIndicators().catch(() => null)]);

  const industries = fastestGrowingSectors(6);
  const fastestRegions = regionBreakdown()
    .slice(0, 6)
    .map((r) => ({ region: r.region, growthIndex: r.growthIndex, pay: nomis?.[r.region]?.medianWeeklyPay ?? REGION_STATS[r.region]?.medianWeeklyPay ?? 0 }));

  return NextResponse.json({
    parsed,
    results,
    live,
    industries,
    fastestRegions,
    topRegions: activity?.regions ?? [],
    topSics: activity?.sics ?? [],
  });
}
