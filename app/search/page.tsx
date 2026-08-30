// THE search surface — one page for anonymous visitors, free accounts and Pro.
//
// Search itself is open to everyone: the company profiles it links to are the
// indexable SEO surface (also reachable from /industry and /city), so hiding
// results from logged-out visitors would only break the Google → search →
// profile journey. What tiers is DEPTH — how much of the register you can sweep
// and what you can do with it — which is the part that actually costs us to
// serve and the part Pro is really buying.
//
// noindex: query pages are thin and near-duplicate. The landing state is worth
// indexing, so it stays crawlable when no query is present.
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/access";
import { planById, type PlanId } from "@/lib/subscription";
import { isAdmin, isPartner } from "@/lib/admin";
import { getSavedLens } from "@/lib/profile";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sectorBreakdown } from "@/lib/analytics";
import { countCompanies } from "@/lib/companies-house";
import { PublicShell } from "@/components/public/PublicShell";
import { SearchExperience, type SavedSearch } from "@/components/search/SearchExperience";

export const dynamic = "force-dynamic";

// Any filtered, sorted or paged state is thin, near-duplicate and combinatorial
// — a handful of facets is thousands of URLs. Only the bare landing state is
// indexable. Previously only `q` triggered noindex, so /search?sector=…&page=3
// was served as "index, follow" while canonicalising to /search: two
// contradictory instructions on the same page, and an index-bloat vector.
const FACET_PARAMS = ["q", "sector", "region", "status", "page", "sort", "size", "start", "lens"] as const;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const query = (typeof sp.q === "string" ? sp.q : "").trim();
  const filtered = FACET_PARAMS.some((k) => {
    const v = sp[k];
    return Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim() !== "";
  });
  return {
    title: query ? `Results for “${query}”` : "Search 5.5m UK companies",
    description:
      "Search every company on the UK register by name, sector, SIC code or town — scored for what you sell. Free profiles, live from Companies House.",
    robots: filtered ? { index: false, follow: true } : { index: true, follow: true },
    alternates: { canonical: "/search" },
  };
}

const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const user = await getCurrentUser();
  const signedIn = !!user;
  const plan = user ? await getUserPlan(user) : "free";
  const comped = !!user && (isAdmin(user) || isPartner(user));
  const caps = planById(plan as PlanId).caps;
  const pro = comped || plan !== "free";

  // The landing panels only matter when there's no query to answer, so they're
  // skipped entirely on a results render — no wasted register calls.
  const [newThisMonth, saved, savedLens] = await Promise.all([
    query
      ? Promise.resolve(null)
      : countCompanies({ incorporatedFrom: isoDaysAgo(30), incorporatedTo: isoDaysAgo(0) }).catch(() => null),
    loadSaved(user?.id),
    user ? getSavedLens(user.id).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <PublicShell>
      <div className="screen">
        <SearchExperience
          initialQuery={query}
          tier={{ signedIn, pro, canSaveSearches: comped || caps.savedSearches }}
          savedLens={savedLens}
          initialSaved={saved}
          sectors={sectorBreakdown().slice(0, 6).map((s) => ({ name: s.name, count: s.count, formatted: s.formatted }))}
          newThisMonth={newThisMonth}
        />
      </div>
    </PublicShell>
  );
}

async function loadSaved(userId?: string): Promise<SavedSearch[]> {
  if (!userId) return [];
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  try {
    const { data } = await admin
      .from("saved_searches")
      .select("id,label,query,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6);
    return (data ?? []) as SavedSearch[];
  } catch {
    return [];
  }
}
