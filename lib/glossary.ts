// ============================================================
// Glossary — every tooltip on the company report, in one place.
//
// Keyed by term so the ⓘ tooltips and the first-visit tour read the same
// words and cannot drift apart. Static and deterministic: a few entries take
// the company's own figures (region, peer count) as arguments, but nothing
// here is generated at render, and nothing claims a fact the register does
// not hold. Fingerprint values are an INDEX built from heuristics, so their
// tooltips say "index", never "measurement".
// ============================================================

export interface GlossEntry {
  title: string;
  body: string;
  /** Small caps footer: where the figure comes from. */
  source?: string;
}

export const GLOSS = {
  lens: {
    title: "Scored for",
    body: "The type of business you sell. The data is the same for everyone — this decides which signals matter and how much each one counts.",
    source: "Your choice · change it any time",
  },
  score: {
    title: "Opportunity score",
    body: "How good a fit this company is for what you sell, from 0 to 100. It adds up the signals listed beside it, each weighted by how much it matters to your type of business.",
    source: "CompaniesIQ lens model",
  },
  confidence: {
    title: "Confidence",
    body: "How much of the score rests on measured data. Below high means at least one signal is not public, so its weight was left out and the score rests on the rest.",
    source: "Share of model weight measured",
  },
  bands: {
    title: "Score bands",
    body: "Low is under 34, Moderate 34–66, Strong 67 and above. Signals we couldn't check are left out of the maths, not counted as zero.",
  },
} satisfies Record<string, GlossEntry>;

// ---- Key facts ----------------------------------------------------------------

export const FACT_TIPS = {
  growth: (region: string): GlossEntry => ({
    title: "Industry growth",
    body: `Yearly change in the number of companies being formed in this sector across the UK. The ${region} rate is on the Market tab.`,
    source: "Companies House · ONS",
  }),
  filing: {
    title: "Annual filing",
    body: "The confirmation statement — a yearly form confirming the company's details. Missing it is the most common reason companies get struck off.",
    source: "Companies House filing history",
  },
  age: {
    title: "Company age",
    body: "Time since the company was registered. Across most sectors, survival odds improve sharply once a business is past its first five years.",
    source: "Companies House",
  },
  competition: {
    title: "Local competition",
    body: "How many similar companies are registered in this region compared with elsewhere. Very high means a crowded local market.",
    source: "Companies House · ONS",
  },
} satisfies Record<string, GlossEntry | ((...a: string[]) => GlossEntry)>;

// ---- Fingerprint ----------------------------------------------------------------

export type DimKey = "financial" | "growth" | "market" | "compliance" | "competition" | "fit";

/** Tooltip = what the number means; explain = shown when the cell is selected. */
export const DIM_TIPS: Record<DimKey, { tip: GlossEntry; explain: string }> = {
  financial: {
    tip: { title: "Financial", body: "An index from 0 to 100, not a measurement. Higher is healthier. Built from whether accounts are on file." },
    explain: "Built from filed accounts. With none filed, this stays low until the first accounts land on the register.",
  },
  growth: {
    tip: { title: "Growth", body: "An index from 0 to 100. Higher means the sector is forming new companies faster." },
    explain: "Driven by the sector's national formation trend. It describes the market this company trades in, not the company's own headcount or revenue.",
  },
  market: {
    tip: { title: "Market", body: "An index from 0 to 100. Higher means a stronger local market — sector survival rates and regional growth against national." },
    explain: "Combines five-year survival in the sector with whether the region is growing faster or slower than the UK.",
  },
  compliance: {
    tip: { title: "Compliance", body: "An index from 0 to 100. Higher means up to date with Companies House." },
    explain: "Drops sharply when the accounts or confirmation statement are overdue. The Records tab shows the filing history behind it.",
  },
  competition: {
    tip: {
      title: "Competition",
      body: "Careful — higher means MORE competitors nearby, not better. An index from 0 to 100 of how crowded the regional market is.",
    },
    explain: "Read this one the other way round: a high number means a crowded market, where differentiation matters more than timing.",
  },
  fit: {
    tip: { title: "Fit for you", body: "Your opportunity score for what you sell, shown here so you can compare it with the other five." },
    explain: "This is the score at the top of the page. Change what you sell and it re-weights; the other five stay the same.",
  },
};

// ---- Lens-card rows ---------------------------------------------------------------

/** Keyed by the row label `buildLensCard` emits. Unknown rows fall back to DEFAULT_ROW_TIP. */
export const ROW_TIPS: Record<string, string> = {
  "SIC code": "The official code for the company's line of business. It decides which risk class and which similar companies we compare against.",
  Trade: "The plain-English description of the SIC code above.",
  Premises: "Only the registered office is on file. That's the legal address — often a home or accountant's address, not where they trade.",
  "Asset disclosure": "Assets only appear in filed accounts or registered charges. Where neither exists, nothing is known.",
  "Agent on record": "Companies House doesn't publish who files on a company's behalf, so this can never be ruled in or out from the register.",
  "PSCs on record": "People with significant control — usually owners of more than 25% of the shares or votes.",
  Directors: "Directors currently appointed, from the officers register.",
  "Accounts next due": "The date Companies House expects the next set of accounts.",
  "Confirmation statement": "The date the next yearly confirmation statement is due.",
  "Ledger complexity": "Directors, PSCs and charges added together — a rough guide to how involved the books are.",
  "Regional density": "How many similar companies are in this area compared with the UK average.",
  Status: "The company's status on the Companies House register.",
  Age: "Time since incorporation.",
  "Sector growth": "Yearly change in company formations across the sector, UK-wide.",
  Website: "Checked with a live Google Places lookup on paid plans. Not found never means confirmed absent.",
  "Google Business Profile": "Checked with a Google Places lookup on paid plans.",
  Reviews: "Google reviews found for the business, on paid plans.",
  "Public phone": "A phone number listed publicly for the business, on paid plans.",
  "Charges registered": "Loans or security registered against the company's assets.",
  "Filed accounts": "The period the most recent filed accounts were made up to.",
  "Trading history": "Time since incorporation — lenders read anything under two years as a thin file.",
  "Insolvency status": "Any liquidation, administration or receivership status on the register.",
};

export const DEFAULT_ROW_TIP = "Read directly from the Companies House record.";

// ---- First-visit tour --------------------------------------------------------------

export type TourTarget = "lens" | "score" | "fingerprint" | "next";

/** The four steps, in order. `body` may take the lens audience. */
export const TOUR: { target: TourTarget; title: string; body: (audience: string) => string }[] = [
  {
    target: "lens",
    title: "Start with what you sell",
    body: (a) =>
      `Right now this company is scored for ${a}. If you sell something else, change it here — everything on the page re-scores.`,
  },
  {
    target: "score",
    title: "Read the verdict, then the reasons",
    body: () =>
      "The score and band say how strong a fit this is. The rows beside it show why — select one to see the evidence. Anything we couldn't check is left out, not counted as zero.",
  },
  {
    target: "fingerprint",
    title: "Compare six dimensions",
    body: () =>
      "Each is an index from 0 to 100 against sector peers. Watch the direction: on Competition, higher means more crowded.",
  },
  {
    target: "next",
    title: "Then act on it",
    body: () =>
      "Concrete next steps for what you sell. For more detail, use the tabs above: the market, nearby competitors and the full record.",
  },
];

export const WELCOME_HINTS = [
  "Hover or tap any ⓘ for what a metric means",
  "Select any score row to see why",
  "Change what you sell to re-score the page",
];
