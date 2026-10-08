// ============================================================
// Market links — a pre-configured search, carried in the URL.
//
// Content (research editions, industry and city pages, use cases) ends with
// "Build this market →". That link has to land on a search that is already set
// up, or the reader is dumped on an empty box and the article was the end of
// the journey instead of the start of the product.
//
// Free text can't carry this reliably: "Newcastle upon Tyne" reads as the town
// plus a name fragment "upon tyne", and a SIC code has no words at all. So the
// filters travel as structured params and /search runs them as-is, while a
// human label fills the search box so the reader sees what they're looking at.
//
// Client-safe: imported by both the /search page and SearchExperience.
// ============================================================
import { ALL_SECTORS } from "@/lib/sic";
import { ALL_REGIONS } from "@/lib/geography";

export type IncWindow = "30d" | "12m" | "5y";
const INC_WINDOWS: IncWindow[] = ["30d", "12m", "5y"];
const INC_LABEL: Record<IncWindow, string> = {
  "30d": "incorporated in the last 30 days",
  "12m": "incorporated in the last 12 months",
  "5y": "incorporated in the last 5 years",
};

export interface MarketPreset {
  sector?: string;
  /** Registered-office town, passed to Companies House as `location`. */
  place?: string;
  region?: string;
  /** One SIC code, or several comma-separated ("69201,69202") — matched as any of. */
  sic?: string;
  /** A market name for the search box, e.g. "Accountancy firms". */
  name?: string;
  incorporated?: IncWindow;
  /** Where the click came from, e.g. "research:uk-company-formations-h1-2026". */
  from?: string;
}

const SIC_RE = /^\d{4,5}(,\d{4,5}){0,7}$/;
// A display name only — letters, spaces and a little punctuation, so a crafted
// link can't put arbitrary text in the page title.
const NAME_RE = /^[A-Za-z][A-Za-z &,'-]{1,58}$/;
const clean = (s: string | null | undefined, max = 60) => {
  const v = (s ?? "").trim();
  return v && v.length <= max ? v : undefined;
};

/** Read a preset from /search's query params. Unknown values are dropped, not trusted. */
export function parsePreset(sp: Record<string, string | string[] | undefined>): MarketPreset | null {
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const sector = clean(one("sector"));
  const region = clean(one("region"));
  const sic = clean(one("sic"));
  const name = clean(one("name"));
  const inc = one("inc") as IncWindow | undefined;
  const preset: MarketPreset = {
    sector: sector && ALL_SECTORS.includes(sector) ? sector : undefined,
    region: region && ALL_REGIONS.includes(region) ? region : undefined,
    place: clean(one("place")),
    sic: sic && SIC_RE.test(sic) ? sic : undefined,
    name: name && NAME_RE.test(name) ? name : undefined,
    incorporated: inc && INC_WINDOWS.includes(inc) ? inc : undefined,
    from: clean(one("from"), 120),
  };
  return preset.sector || preset.region || preset.place || preset.sic ? preset : null;
}

/** The sentence shown in the search box, e.g. "New construction companies in Leeds". */
export function presetLabel(p: MarketPreset): string {
  const what = p.name ? p.name : p.sic ? `SIC ${p.sic.split(",").join(", ")} companies` : p.sector ? `${p.sector} companies` : "Companies";
  const where = p.place ? ` in ${p.place}` : p.region ? ` in ${p.region}` : "";
  const when = p.incorporated ? ` ${INC_LABEL[p.incorporated]}` : "";
  return `${what}${where}${when}`;
}

/** The /search URL for a preset. Use this for every "Build this market →" link. */
export function marketSearchHref(p: MarketPreset): string {
  const sp = new URLSearchParams();
  if (p.sector) sp.set("sector", p.sector);
  if (p.place) sp.set("place", p.place);
  if (p.region) sp.set("region", p.region);
  if (p.sic) sp.set("sic", p.sic);
  if (p.name) sp.set("name", p.name);
  if (p.incorporated) sp.set("inc", p.incorporated);
  if (p.from) sp.set("from", p.from);
  return `/search?${sp.toString()}`;
}

/** /api/search params for a preset — active companies only, as a prospect list should be. */
export function presetApiParams(p: MarketPreset): URLSearchParams {
  const sp = new URLSearchParams();
  if (p.sector) sp.set("sector", p.sector);
  if (p.region) sp.set("region", p.region);
  if (p.place) sp.set("location", p.place);
  for (const code of (p.sic ?? "").split(",").filter(Boolean)) sp.append("sic", code);
  if (p.incorporated) sp.set("incorporated", p.incorporated);
  sp.append("status", "active");
  return sp;
}
