// ============================================================
// Market summary — the numbers behind a "prospect list" search.
//
// A search like "new construction companies in Birmingham" is the start of a
// prospect list, so the search page frames it as one: how many ACTIVE
// companies the register holds for that sector and place, and how many formed
// in the last 30 days. Both counts come from Companies House advanced search
// (its own `hits` total), not from the sampled page the results table shows.
//
// Honesty notes the UI must carry (see MarketHeader):
//   • a sector is queried as the SIC codes we track in it (sicCodesForSector) —
//     a subset of its SIC division, so the count is "across N tracked codes";
//   • place is Companies House's registered-office `location` text match, so it
//     is where companies are registered, not necessarily where they trade.
// Cached for 6 hours per (sector, location) — the register moves daily, not by
// the minute, and every count is two Companies House calls.
// ============================================================
import "server-only";
import { unstable_cache } from "next/cache";
import * as ch from "@/lib/companies-house";
import { sicCodesForSector } from "@/lib/sic";

/** Regions Companies House's location text can match reliably (as data.ts does). */
const REGION_LOCATION: Record<string, string> = {
  London: "London",
  Scotland: "Scotland",
  Wales: "Wales",
  "Northern Ireland": "Northern Ireland",
};

export interface MarketSummary {
  sector: string | null;
  location: string | null; // the place / region text actually queried
  sicCodes: number; // tracked SIC codes the sector was queried as (0 = any sector)
  active: number; // active companies matching
  new30: number; // incorporated in the last 30 days (active)
}

const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

async function compute(sector: string | null, location: string | null): Promise<MarketSummary | null> {
  const sicCodes = sector ? sicCodesForSector(sector) : [];
  if (sector && !sicCodes.length) return null; // unknown sector — don't guess
  const base: ch.AdvancedSearchParams = { sicCodes, location: location ?? undefined, status: ["active"], size: 1 };
  const [all, fresh] = await Promise.all([
    ch.advancedSearch(base),
    ch.advancedSearch({ ...base, incorporatedFrom: isoDaysAgo(30) }),
  ]);
  return { sector, location, sicCodes: sicCodes.length, active: all.total, new30: fresh.total };
}

const cached = unstable_cache(compute, ["market-summary-v1"], { revalidate: 6 * 3600 });

/**
 * Summary for a sector and/or place. Needs at least one of them; a region only
 * counts when Companies House can match it as text (see REGION_LOCATION) —
 * otherwise we'd be presenting a text match on "West Midlands" as the region.
 */
export async function getMarketSummary(input: { sector?: string | null; place?: string | null; region?: string | null }): Promise<MarketSummary | null> {
  const sector = input.sector?.trim() || null;
  const location = input.place?.trim() || (input.region ? REGION_LOCATION[input.region] ?? null : null);
  if (!sector && !location) return null;
  try {
    return await cached(sector, location);
  } catch {
    return null; // Companies House busy — the header simply shows without numbers
  }
}
