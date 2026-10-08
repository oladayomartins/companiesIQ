// ============================================================
// Research pipeline — shared types
// ------------------------------------------------------------
// A "study" is a repeatable piece of primary research: a fixed
// question ("which SIC codes registered the most new companies?"),
// a period, and a query plan that answers it from the Companies
// House register. Running a study produces a Dataset — every
// figure that will appear in the published article, plus the exact
// queries that produced it, so any claim can be re-derived by a
// reader (or a search engine's fact-checker) from the public API.
//
// The Dataset is the unit of trust in this system. Prose is
// generated FROM it; nothing in an article may assert a number
// that isn't in the dataset.
// ============================================================

/** A measurement window. `from`/`to` are inclusive ISO dates (YYYY-MM-DD). */
export interface Period {
  /** Stable machine id used in slugs, e.g. "h1-2026", "q2-2026". */
  id: string;
  /** Human label, e.g. "H1 2026" (used in prose and headings). */
  label: string;
  /** Longer label for first mention, e.g. "the first half of 2026". */
  longLabel: string;
  from: string;
  to: string;
}

/** One measured row — a SIC code, a town, a sector. */
export interface Cell {
  /** Machine key (SIC code, city slug…). */
  key: string;
  /** Display label. */
  label: string;
  /** Optional qualifier shown under/next to the label (sector, region). */
  sub?: string;
  /** The headline measurement for this row in the current period. */
  value: number;
  /** The same measurement in the comparison period, when one was run. */
  prev?: number;
  /** value − prev. */
  change?: number;
  /** (value − prev) / prev, as a fraction. Null when prev is 0/absent. */
  changePct?: number | null;
  /** Share of the period total, as a fraction (context-dependent — see notes). */
  share?: number;
  /** Any secondary measure the study collected for this row (e.g. dissolutions). */
  extra?: Record<string, number>;
  /** Internal page this row maps to, for the targeting layer. */
  href?: string;
  /**
   * Set when a row's movement is too large to read as a market trend. Such
   * rows stay in the tables — they are facts — but are kept out of headline
   * claims and footnoted, because a single bulk registration event at one
   * address can move a row by hundreds of percent.
   */
  anomaly?: boolean;
}

export interface Series {
  id: string;
  label: string;
  /** What one unit means, e.g. "companies incorporated". */
  unit: string;
  cells: Cell[];
}

/**
 * A single API call and its result. Every number in a dataset traces back to
 * one of these, and the params are complete enough to replay verbatim.
 */
export interface QueryRecord {
  label: string;
  endpoint: string;
  params: Record<string, string | string[]>;
  hits: number;
}

export interface DatasetSource {
  name: string;
  url: string;
  licence: string;
  licenceUrl: string;
  /** ISO timestamp the data was pulled. */
  retrieved: string;
}

/** A methodology note rendered verbatim in the article's methodology section. */
export interface MethodNote {
  heading: string;
  body: string;
}

export interface Dataset {
  /** Study id, e.g. "sic-formations". */
  study: string;
  /** Slug of the article this dataset backs. */
  slug: string;
  title: string;
  period: Period;
  comparison: Period | null;
  /** When the pipeline ran. */
  generatedAt: string;
  /** Headline scalars used in the intro and schema, e.g. total incorporations. */
  totals: Record<string, number>;
  series: Series[];
  method: MethodNote[];
  /** Caveats that MUST be surfaced in the article (validation enforces this). */
  caveats: string[];
  queries: QueryRecord[];
  source: DatasetSource;
  /** Size of any discovery sample used to pick candidates (0 = full census). */
  sampleSize: number;
}

/** What a study renders — maps 1:1 onto the `posts` table. */
export interface PostDraft {
  slug: string;
  title: string;
  excerpt: string;
  meta_description: string;
  body_md: string;
  faq: { q: string; a: string }[];
  related: { label: string; href: string }[];
}

export interface Study {
  id: string;
  /** One line describing what this study measures (used in docs + the hub). */
  question: string;
  /** How often a new edition is due. */
  cadence: "half" | "quarter";
  /**
   * Periods that should have a published edition by `now`, newest first.
   * A period only qualifies once it has fully elapsed plus the register's
   * publication lag, so we never report a half-finished half-year.
   */
  periods(now: Date): Period[];
  slugFor(period: Period): string;
  collect(period: Period, comparison: Period | null): Promise<Dataset>;
  render(dataset: Dataset): PostDraft;
  /** Study-specific integrity checks, run alongside the shared gates. */
  check?(dataset: Dataset): import("./validate").Issue[];
}
