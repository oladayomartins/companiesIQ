// AI opportunity discovery + natural-language search.
// Parses the NL query into structured filters, runs the explorer,
// post-filters by sector/keywords, and returns data-derived
// emerging niches + regional hotspots alongside the matches.
import { NextRequest, NextResponse } from "next/server";
import { explore } from "@/lib/data";
import { parseQuery } from "@/lib/nl-search";
import { aggregateKeywords } from "@/lib/keywords";
import { fastestGrowingSectors, regionBreakdown } from "@/lib/analytics";
import { REGION_STATS } from "@/lib/ons";
import { getRegionIndicators } from "@/lib/nomis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const parsed = await parseQuery(q);

  let results = [] as Awaited<ReturnType<typeof explore>>["results"];
  let live = false;
  if (q.trim()) {
    const r = await explore({
      q: parsed.name || undefined,
      region: parsed.region,
      status: parsed.status.length ? parsed.status : undefined,
      size: 40,
    });
    live = r.live;
    results = r.results;
    if (parsed.sector) results = results.filter((x) => x.classification?.sector === parsed.sector);
    if (parsed.keywords.length) results = results.filter((x) => (x.keywords ?? []).some((k) => parsed.keywords.includes(k)));
    results.sort((a, b) => (b.score?.total ?? 0) - (a.score?.total ?? 0));
  }

  // Emerging niches: fastest-growing sectors crossed with trending keyword signals.
  const niches = fastestGrowingSectors(5);
  const signals = aggregateKeywords(results).slice(0, 6);

  // Regional hotspots: highest growth-index regions; live median pay from Nomis.
  const nomis = await getRegionIndicators();
  const hotspots = regionBreakdown()
    .slice(0, 6)
    .map((r) => ({
      region: r.region,
      growthIndex: r.growthIndex,
      pay: nomis?.[r.region]?.medianWeeklyPay ?? REGION_STATS[r.region]?.medianWeeklyPay ?? 0,
    }));

  return NextResponse.json({ parsed, results, live, niches, signals, hotspots, payLive: !!nomis });
}
