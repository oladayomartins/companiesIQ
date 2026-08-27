// ============================================================
// Query reading — turns "care companies Manchester" into the chips the search
// page shows under "Read as", and into the filters it actually runs.
//
// Deliberately client-safe and deterministic (lib/nl-search.ts is the
// server-only, optionally-LLM version used by /api/parse). The point of the
// chips is that the user can SEE how their words were interpreted before
// trusting the count, so the reading has to happen instantly as they type and
// has to be the same reading the search executes. One parser, both jobs.
// ============================================================
import { ALL_SECTORS } from "@/lib/sic";
import { ALL_REGIONS } from "@/lib/geography";

export type ChipKind = "name" | "sector" | "region" | "place" | "status";

export interface QueryChip {
  value: string;
  kind: ChipKind;
}

export interface ReadQuery {
  chips: QueryChip[];
  sector?: string;
  region?: string;
  /** Registered-office town, passed to Companies House as a location filter. */
  place?: string;
  status: string[];
  /** What is left once the understood words are removed — the name fragment. */
  name: string;
}

// Towns and cities people actually type, mapped to the ONS region they sit in.
// Companies House has no region field, so the town doubles as its `location`
// filter while the region drives our own post-filter.
const PLACES: Record<string, string> = {
  london: "London",
  manchester: "North West",
  liverpool: "North West",
  preston: "North West",
  bolton: "North West",
  birmingham: "West Midlands",
  coventry: "West Midlands",
  wolverhampton: "West Midlands",
  leeds: "Yorkshire & the Humber",
  sheffield: "Yorkshire & the Humber",
  bradford: "Yorkshire & the Humber",
  york: "Yorkshire & the Humber",
  hull: "Yorkshire & the Humber",
  newcastle: "North East",
  sunderland: "North East",
  durham: "North East",
  nottingham: "East Midlands",
  leicester: "East Midlands",
  derby: "East Midlands",
  northampton: "East Midlands",
  bristol: "South West",
  plymouth: "South West",
  exeter: "South West",
  bournemouth: "South West",
  brighton: "South East",
  hove: "South East",
  reading: "South East",
  southampton: "South East",
  portsmouth: "South East",
  oxford: "South East",
  milton: "South East",
  cambridge: "East of England",
  norwich: "East of England",
  ipswich: "East of England",
  luton: "East of England",
  glasgow: "Scotland",
  edinburgh: "Scotland",
  aberdeen: "Scotland",
  dundee: "Scotland",
  cardiff: "Wales",
  swansea: "Wales",
  newport: "Wales",
  belfast: "Northern Ireland",
};

// Everyday words for a sector, so people don't have to know our taxonomy.
const SECTOR_WORDS_RAW: Record<string, string> = {
  care: "Healthcare & social",
  health: "Healthcare & social",
  healthcare: "Healthcare & social",
  nhs: "Healthcare & social",
  motor: "Retail & wholesale",
  car: "Retail & wholesale",
  garage: "Retail & wholesale",
  retail: "Retail & wholesale",
  shop: "Retail & wholesale",
  wholesale: "Retail & wholesale",
  ecommerce: "Retail & wholesale",
  fintech: "Financial services",
  finance: "Financial services",
  financial: "Financial services",
  insurance: "Financial services",
  bank: "Financial services",
  it: "Technology",
  software: "Technology",
  tech: "Technology",
  saas: "Technology",
  digital: "Technology",
  media: "Technology",
  construction: "Construction",
  building: "Construction",
  builder: "Construction",
  plumbing: "Construction",
  electrical: "Construction",
  logistics: "Transport & logistics",
  haulage: "Transport & logistics",
  transport: "Transport & logistics",
  courier: "Transport & logistics",
  freight: "Transport & logistics",
  restaurant: "Hospitality",
  cafe: "Hospitality",
  catering: "Hospitality",
  hotel: "Hospitality",
  hospitality: "Hospitality",
  pub: "Hospitality",
  accountancy: "Professional services",
  accountant: "Professional services",
  legal: "Professional services",
  solicitor: "Professional services",
  consulting: "Professional services",
  consultancy: "Professional services",
  marketing: "Professional services",
  agency: "Professional services",
  property: "Real estate",
  estate: "Real estate",
  letting: "Real estate",
  manufacturing: "Manufacturing",
  engineering: "Manufacturing",
  factory: "Manufacturing",
  energy: "Energy & utilities",
  solar: "Energy & utilities",
  utilities: "Energy & utilities",
  education: "Education",
  school: "Education",
  training: "Education",
  farm: "Agriculture & fishing",
  farming: "Agriculture & fishing",
  agriculture: "Agriculture & fishing",
};

// A synonym that points at a sector we don't actually have would filter every
// search down to nothing, silently. Drop unknown targets at module load instead:
// the word stops being understood, which is visible in the "Read as" chips.
const SECTOR_WORDS: Record<string, string> = Object.fromEntries(
  Object.entries(SECTOR_WORDS_RAW).filter(([, sector]) => ALL_SECTORS.includes(sector))
);

const STATUS_WORDS: Record<string, string> = {
  active: "active",
  trading: "active",
  live: "active",
  dormant: "dormant",
  dissolved: "dissolved",
  closed: "dissolved",
  liquidation: "liquidation",
  insolvent: "liquidation",
  administration: "liquidation",
};

// Words that carry no filter meaning and shouldn't survive into the name.
const STOP = new Set([
  "companies", "company", "ltd", "limited", "in", "near", "around", "the", "a", "an",
  "and", "of", "for", "with", "by", "at", "on", "to", "from", "all", "list", "find",
  "show", "me", "business", "businesses", "firms", "firm", "trade", "trades",
  "sector", "industry",
]);

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Read a query the way the page will run it. Longest-match first on the
 * multi-word vocabulary (regions and sectors) so "North West" doesn't get
 * shredded into two unmatched tokens.
 */
export function readQuery(q: string): ReadQuery {
  const raw = q.trim();
  if (!raw) return { chips: [], status: [], name: "" };

  let rest = ` ${raw.toLowerCase()} `;
  const chips: QueryChip[] = [];
  let sector: string | undefined;
  let region: string | undefined;
  let place: string | undefined;
  const status: string[] = [];

  // Tolerate a plural: "restaurants Bristol" should read the same as
  // "restaurant Bristol".
  const take = (phrase: string) => {
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`, "i");
    if (!re.test(rest)) return false;
    rest = rest.replace(re, " ");
    return true;
  };

  // 1. Full region names ("North West", "Yorkshire & the Humber").
  for (const r of [...ALL_REGIONS].sort((a, b) => b.length - a.length)) {
    if (region) break;
    if (take(r.toLowerCase()) || take(r.toLowerCase().replace(/&/g, "and"))) {
      region = r;
      chips.push({ value: r, kind: "region" });
    }
  }

  // 2. Named sectors from our own taxonomy, before the looser word map.
  for (const s of [...ALL_SECTORS].sort((a, b) => b.length - a.length)) {
    if (sector) break;
    if (take(s.toLowerCase()) || take(s.toLowerCase().replace(/&/g, "and"))) {
      sector = s;
      chips.push({ value: s, kind: "sector" });
    }
  }

  // 3. Single words: towns, sector synonyms, status.
  for (const word of Object.keys(PLACES).sort((a, b) => b.length - a.length)) {
    if (place) break;
    if (take(word)) {
      place = titleCase(word);
      region = region ?? PLACES[word];
      chips.push({ value: place, kind: "place" });
    }
  }
  // A sector SYNONYM narrows the sector but is left in the text: "fintech" is
  // both a sector hint and the word people actually want matched against company
  // names. Consuming it would turn a good query into a blind sector browse.
  // Canonical taxonomy names above are consumed, because nobody is looking for a
  // company literally called "Financial services".
  for (const word of Object.keys(SECTOR_WORDS).sort((a, b) => b.length - a.length)) {
    if (sector) break;
    if (new RegExp(`\\b${word}s?\\b`, "i").test(rest)) {
      sector = SECTOR_WORDS[word];
      chips.push({ value: sector, kind: "sector" });
    }
  }
  for (const word of Object.keys(STATUS_WORDS).sort((a, b) => b.length - a.length)) {
    if (status.length) break;
    if (take(word)) {
      status.push(STATUS_WORDS[word]);
      chips.push({ value: titleCase(STATUS_WORDS[word]), kind: "status" });
    }
  }

  // 4. Whatever survives is a name fragment.
  const name = rest
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t && !STOP.has(t))
    .join(" ")
    .trim();
  if (name) chips.unshift({ value: name, kind: "name" });

  return { chips, sector, region, place, status, name };
}

export const CHIP_LABEL: Record<ChipKind, string> = {
  name: "name",
  sector: "sector",
  region: "region",
  place: "town",
  status: "status",
};
