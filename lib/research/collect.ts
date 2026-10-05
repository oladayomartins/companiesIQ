// ============================================================
// Research pipeline — collection
// ------------------------------------------------------------
// A metered client over the Companies House advanced-search
// endpoint, built for bulk aggregate collection rather than page
// rendering. Differences from lib/companies-house:
//   · every call is recorded in a ledger (the reproducibility
//     trail that ships with the dataset);
//   · no Next.js data cache — a study must read the register as it
//     stands at run time, not whatever a page render left behind;
//   · bounded concurrency + backoff, because a study is hundreds
//     of calls against a 600-per-5-minutes budget.
// ============================================================
import "server-only";
import type { QueryRecord } from "./types";

const BASE = "https://api.company-information.service.gov.uk";
const ENDPOINT = "/advanced-search/companies";

/** Companies House allows 600 requests per 5 minutes; stay well inside it. */
const CONCURRENCY = 6;
const MAX_RETRIES = 4;
const WINDOW_MS = 5 * 60_000;
const WINDOW_BUDGET = 520;
/**
 * How long a call will wait for budget before giving up. A serverless run has a
 * hard ceiling, so a saturated window should fail the edition cleanly — the
 * next scheduled invocation retries with a drained budget — rather than stall
 * until the platform kills it mid-write. Generous locally, where a CLI run can
 * afford to wait.
 */
const MAX_WAIT_MS = Number(process.env.RESEARCH_MAX_WAIT_MS ?? (process.env.NODE_ENV === "production" ? 45_000 : 600_000));

// One process may run several studies in a row, and the register's rate limit
// is per key, not per study. The budget is therefore held at module level: a
// collector that would breach the window waits for a slot instead of spending
// its retries discovering the 429 the hard way.
const spent: number[] = [];

async function takeSlot(): Promise<void> {
  const deadline = Date.now() + MAX_WAIT_MS;
  for (;;) {
    const cutoff = Date.now() - WINDOW_MS;
    while (spent.length && spent[0] < cutoff) spent.shift();
    if (spent.length < WINDOW_BUDGET) {
      spent.push(Date.now());
      return;
    }
    if (Date.now() > deadline) {
      throw new Error("Companies House rate budget exhausted — retry once the five-minute window has drained.");
    }
    // Wait just past the moment the oldest call falls out of the window.
    await new Promise((r) => setTimeout(r, Math.max(250, spent[0] - cutoff + 250)));
  }
}

export interface CountParams {
  sicCodes?: string[];
  status?: string[];
  companyType?: string[];
  location?: string;
  incorporatedFrom?: string;
  incorporatedTo?: string;
  dissolvedFrom?: string;
  dissolvedTo?: string;
  size?: number;
  startIndex?: number;
}

export interface SampleItem {
  number: string;
  name: string;
  sicCodes: string[];
  locality?: string;
  postcode?: string;
  incorporated?: string;
  companyType?: string;
}

function toQuery(p: CountParams): URLSearchParams {
  const qs = new URLSearchParams();
  (p.sicCodes ?? []).forEach((c) => qs.append("sic_codes", c));
  (p.status ?? []).forEach((s) => qs.append("company_status", s));
  (p.companyType ?? []).forEach((t) => qs.append("company_type", t));
  if (p.location) qs.set("location", p.location);
  if (p.incorporatedFrom) qs.set("incorporated_from", p.incorporatedFrom);
  if (p.incorporatedTo) qs.set("incorporated_to", p.incorporatedTo);
  if (p.dissolvedFrom) qs.set("dissolved_from", p.dissolvedFrom);
  if (p.dissolvedTo) qs.set("dissolved_to", p.dissolvedTo);
  qs.set("size", String(p.size ?? 1));
  if (p.startIndex) qs.set("start_index", String(p.startIndex));
  return qs;
}

/** The params as recorded in the ledger — the literal query string, minus paging noise. */
function ledgerParams(p: CountParams): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  const qs = toQuery(p);
  for (const key of new Set(qs.keys())) {
    if (key === "size" || key === "start_index") continue;
    const all = qs.getAll(key);
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * A collector owns one study run: the auth, the call budget and the ledger.
 * Every count taken through it is auditable afterwards.
 */
export class Collector {
  readonly ledger: QueryRecord[] = [];
  private calls = 0;
  private readonly auth: string;

  constructor(apiKey = process.env.COMPANIES_HOUSE_API_KEY) {
    if (!apiKey) throw new Error("COMPANIES_HOUSE_API_KEY is not set — a study cannot run without register access.");
    this.auth = "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
  }

  get callCount(): number {
    return this.calls;
  }

  private async request(params: CountParams): Promise<{ hits: number; items: SampleItem[] }> {
    const url = `${BASE}${ENDPOINT}?${toQuery(params).toString()}`;
    for (let attempt = 0; ; attempt++) {
      await takeSlot();
      this.calls++;
      let res: Response;
      try {
        res = await fetch(url, {
          headers: { Authorization: this.auth, Accept: "application/json" },
          cache: "no-store",
        });
      } catch (e) {
        if (attempt >= MAX_RETRIES) throw e;
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      // Advanced search 404s (rather than returning an empty set) when a
      // filter combination matches nothing. That is a real zero, not a fault.
      if (res.status === 404) return { hits: 0, items: [] };
      if (res.status === 429 || res.status >= 500) {
        if (attempt >= MAX_RETRIES) throw new Error(`Companies House returned ${res.status} after ${MAX_RETRIES} retries`);
        // A 429 means the rolling window is already exhausted — the only cure
        // is to let it drain, so back off in tens of seconds, not milliseconds.
        await sleep(res.status === 429 ? 30_000 * (attempt + 1) : 1000 * 2 ** attempt);
        continue;
      }
      if (!res.ok) throw new Error(`Companies House returned ${res.status} for ${ENDPOINT}`);
      const json = (await res.json()) as {
        hits?: number;
        items?: {
          company_number: string;
          company_name: string;
          sic_codes?: string[];
          date_of_creation?: string;
          company_type?: string;
          registered_office_address?: { locality?: string; postal_code?: string };
        }[];
      };
      const items = (json.items ?? []).map((it) => ({
        number: it.company_number,
        name: it.company_name,
        sicCodes: it.sic_codes ?? [],
        locality: it.registered_office_address?.locality,
        postcode: it.registered_office_address?.postal_code,
        incorporated: it.date_of_creation,
        companyType: it.company_type,
      }));
      return { hits: json.hits ?? items.length, items };
    }
  }

  /** An exact register count for a filter, recorded in the ledger. */
  async count(label: string, params: CountParams): Promise<number> {
    const { hits } = await this.request({ ...params, size: 1 });
    this.ledger.push({ label, endpoint: ENDPOINT, params: ledgerParams(params), hits });
    return hits;
  }

  /** Counts for many filters, run with bounded concurrency, in input order. */
  async countMany<T>(items: T[], fn: (item: T) => { label: string; params: CountParams }): Promise<number[]> {
    const out = new Array<number>(items.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      for (;;) {
        const i = cursor++;
        if (i >= items.length) return;
        const { label, params } = fn(items[i]);
        out[i] = await this.count(label, params);
      }
    });
    await Promise.all(workers);
    return out;
  }

  /**
   * Pull a page of companies for DISCOVERY only — used to find which codes or
   * towns are worth measuring. Discovery samples never produce a published
   * figure; every published figure is an exact `count`.
   */
  async sample(params: CountParams & { size: number }): Promise<SampleItem[]> {
    const { items } = await this.request(params);
    return items;
  }
}
