// Latest published Commercial Opportunity edition per market, for linking from
// evergreen pages (use cases). Editions are period-specific slugs, so a static
// link would either go stale or point at a quarter that hasn't published yet;
// reading the newest PUBLISHED post per market avoids both.
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { marketSearchHref } from "@/lib/market-link";
import { marketById, type Market } from "./markets";

export interface MarketEdition {
  market: Market;
  slug: string;
  title: string;
  excerpt: string;
  /** The whole market as a pre-built list. */
  buildHref: string;
  /** With a place: that place's count in the edition, and the period it covers. */
  placeCount?: number | null;
  periodLabel?: string;
  /** With a region: each measured town in it and its count (biggest first); placeCount is their total. */
  regionTowns?: { name: string; count: number; buildHref: string }[];
}

const PREFIX = "commercial-opportunity-";

export async function latestMarketEditions(
  marketIds: string[],
  from: string,
  place?: string,
  /** A region instead of a town: figures are summed over the region's measured towns. */
  region?: { name: string; towns: string[] }
): Promise<MarketEdition[]> {
  const admin = getSupabaseAdmin();
  if (!admin || !marketIds.length) return [];
  const { data } = await admin
    .from("posts")
    .select("slug,title,excerpt,published_at")
    .eq("status", "published")
    .like("slug", `${PREFIX}%`)
    .order("published_at", { ascending: false });
  const rows = (data ?? []) as { slug: string; title: string; excerpt: string | null }[];

  // A place's own figure comes from the stored dataset (the edition measured 39
  // towns), so a city page can say how many formed THERE, not repeat the UK total.
  const payloads = new Map<string, { period?: { label?: string }; series?: { id: string; cells: { key: string; value: number }[] }[] }>();
  if (place || region) {
    const slugs = marketIds.map((id) => rows.find((r) => r.slug.startsWith(`${PREFIX}${id}-`))?.slug).filter(Boolean) as string[];
    if (slugs.length) {
      const { data: ds } = await admin.from("research_datasets").select("slug,payload").in("slug", slugs);
      for (const d of (ds ?? []) as { slug: string; payload: never }[]) payloads.set(d.slug, d.payload);
    }
  }

  const out: MarketEdition[] = [];
  for (const id of marketIds) {
    const market = marketById(id);
    // Slug is `${PREFIX}${id}-${period}`; the period suffix never contains the
    // next market's id, so a prefix match on `${PREFIX}${id}-` is exact.
    const row = market && rows.find((r) => r.slug.startsWith(`${PREFIX}${id}-`));
    if (!market || !row) continue;
    const payload = payloads.get(row.slug);
    const cells = payload?.series?.find((s) => s.id === "top")?.cells ?? [];
    const cell = cells.find((c) => c.key === place);
    // Towns missing from the edition's rows had zero registrations (zero rows are dropped).
    // Build links go per town: Companies House filters on location itself, so a town
    // list is complete, whereas a region filter only narrows one page of national
    // results and comes back nearly empty.
    const codes = market.codes.map((c) => c.code).join(",");
    const regionTowns = region
      ? region.towns
          .map((t) => ({
            name: t,
            count: cells.find((c) => c.key === t)?.value ?? 0,
            buildHref: marketSearchHref({ sic: codes, name: `New ${market.noun}`, place: t, incorporated: "12m", from }),
          }))
          .sort((a, b) => b.count - a.count)
      : undefined;
    out.push({
      ...(place && payload ? { placeCount: cell ? cell.value : 0, periodLabel: payload.period?.label } : {}),
      ...(regionTowns && payload
        ? { regionTowns, placeCount: regionTowns.reduce((a, t) => a + t.count, 0), periodLabel: payload.period?.label }
        : {}),
      market,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt ?? "",
      buildHref: marketSearchHref({
        sic: market.codes.map((c) => c.code).join(","),
        name: `New ${market.noun}`,
        place,
        incorporated: "12m",
        from,
      }),
    });
  }
  return out;
}
