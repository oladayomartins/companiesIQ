// ============================================================
// Sector × city matrix — the programmatic long-tail layer
// ------------------------------------------------------------
// Powers /industry/[sector]/[city] ("new construction companies in
// Manchester"). The full matrix is SECTOR_STATS (14) × CITIES (39) =
// 546 combinations, but only a CURATED, DETERMINISTIC subset is ever
// indexed — indexation is NOT decided by a live company count.
//
// Why deterministic, not count-based: a live count that varies each
// revalidation would (a) make a page flap between index and noindex,
// showing Google an unstable signal, and (b) risk a sitemap URL going
// noindex (a self-contradiction). So instead:
//
//   · PRIORITY combos (big cities × common sectors, which reliably
//     carry real formation data) are the ONLY indexable + sitemapped +
//     internally-linked leaves. isPriorityCombo() is the single source
//     of truth, used by the page's robots tag AND the sitemap, so the
//     two can never diverge.
//   · Every other valid combo still renders (real data, 200) but is
//     robots:noindex,follow and is not advertised — a graceful fallback
//     for a hand-typed URL, not a page we ask Google to index.
//
// This is the guardrail against doorway/thin-content and index bloat:
// we index a bounded, curated set of genuinely data-rich location pages,
// not hundreds of near-duplicate permutations.
// ============================================================
import { SECTOR_STATS, type SectorStat } from "@/lib/ons";
import { CITIES, type City } from "@/lib/cities";
import { slugify } from "@/lib/slug";

// Trailing window (days) used to pull the "recently registered" list.
export const RECENT_WINDOW_DAYS = 365;

export const MATRIX_SECTORS: SectorStat[] = Object.values(SECTOR_STATS);
export const MATRIX_CITIES: City[] = CITIES;

export function sectorForSlug(slug: string): SectorStat | null {
  return MATRIX_SECTORS.find((s) => slugify(s.sector) === slug) ?? null;
}

// A valid leaf is a known sector slug × known city slug. cityForSlug lives in
// lib/cities.ts; re-exported here so the page imports one module.
export { cityForSlug } from "@/lib/cities";

// The indexable set: common commercial sectors × the largest UK cities. Every
// one of these reliably carries recent formations, so force-indexing them (no
// live gate) is safe and stable. Curated conservatively — niche sectors and
// small towns are deliberately excluded so we never index a thin permutation.
const PRIORITY_SECTOR_LABELS = [
  "Technology",
  "Construction",
  "Professional services",
  "Financial services",
  "Business support",
  "Real estate",
  "Retail & wholesale",
  "Healthcare & social",
  "Hospitality",
];
const PRIORITY_CITY_NAMES = [
  "London",
  "Manchester",
  "Birmingham",
  "Leeds",
  "Bristol",
  "Glasgow",
  "Edinburgh",
  "Liverpool",
  "Sheffield",
  "Nottingham",
];

const PRIORITY_SECTOR_SLUGS = new Set(
  PRIORITY_SECTOR_LABELS.map((l) => slugify(SECTOR_STATS[l]?.sector ?? l))
);
const PRIORITY_CITY_SLUGS = new Set(PRIORITY_CITY_NAMES.map((n) => slugify(n)));

/** Is this sector one we build indexable city pages for? */
export function isPrioritySector(sectorSlug: string): boolean {
  return PRIORITY_SECTOR_SLUGS.has(sectorSlug);
}

/** The single source of truth for whether a leaf is indexable + sitemapped. */
export function isPriorityCombo(sectorSlug: string, citySlug: string): boolean {
  return PRIORITY_SECTOR_SLUGS.has(sectorSlug) && PRIORITY_CITY_SLUGS.has(citySlug);
}

/** Cities we link + index for a given (priority) sector. */
export function priorityCitiesFor(sectorSlug: string): City[] {
  if (!isPrioritySector(sectorSlug)) return [];
  return CITIES.filter((c) => PRIORITY_CITY_SLUGS.has(slugify(c.name)));
}

export interface Combo {
  sectorSlug: string;
  citySlug: string;
}

/** Curated high-value sector×city combos — pre-render + sitemap set. Kept a
 *  bounded static list so the sitemap needs zero live API calls. Matches
 *  isPriorityCombo() exactly, so sitemap ⊆ indexable is guaranteed. */
export function priorityCombos(): Combo[] {
  const out: Combo[] = [];
  for (const label of PRIORITY_SECTOR_LABELS) {
    const s = SECTOR_STATS[label];
    if (!s) continue;
    for (const name of PRIORITY_CITY_NAMES) {
      const c = CITIES.find((x) => x.name === name);
      if (!c) continue;
      out.push({ sectorSlug: slugify(s.sector), citySlug: slugify(c.name) });
    }
  }
  return out;
}
