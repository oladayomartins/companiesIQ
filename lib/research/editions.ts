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
}

const PREFIX = "commercial-opportunity-";

export async function latestMarketEditions(marketIds: string[], from: string): Promise<MarketEdition[]> {
  const admin = getSupabaseAdmin();
  if (!admin || !marketIds.length) return [];
  const { data } = await admin
    .from("posts")
    .select("slug,title,excerpt,published_at")
    .eq("status", "published")
    .like("slug", `${PREFIX}%`)
    .order("published_at", { ascending: false });
  const rows = (data ?? []) as { slug: string; title: string; excerpt: string | null }[];

  const out: MarketEdition[] = [];
  for (const id of marketIds) {
    const market = marketById(id);
    // Slug is `${PREFIX}${id}-${period}`; the period suffix never contains the
    // next market's id, so a prefix match on `${PREFIX}${id}-` is exact.
    const row = market && rows.find((r) => r.slug.startsWith(`${PREFIX}${id}-`));
    if (!market || !row) continue;
    out.push({
      market,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt ?? "",
      buildHref: marketSearchHref({
        sic: market.codes.map((c) => c.code).join(","),
        name: `New ${market.noun}`,
        incorporated: "12m",
        from,
      }),
    });
  }
  return out;
}
