# Company financials from filed accounts (iXBRL) — spec

_Status: **spec, not built.** Companion to `docs/enrichment.md`. Free-data feature: financials parsed from the accounts companies file at Companies House._

## Goal & what it adds

Turn each company from "a name + a formation date" into a **sized, health-scored** record — turnover, net worth, cash — parsed for free from filed accounts. Unlocks **filter/rank by size and financial health** in search, a Financials card on the company report, and the raw material for growth scoring. Closes the Endole/Company Check gap using only public data.

## Why it's an extension, not a new build

CompaniesIQ already solves the hard part — "filters Companies House search can't do" — with a Supabase register cache:

- `public.companies` caches per-company fields (status, sector, region, **filing-status columns**), populated by the ingest job + `scripts/backfill-filing.mjs`.
- `lib/data.ts` `exploreWithFiling()` joins that cache to a live CH search so users can filter on **accounts overdue / due soon** — data not in CH advanced search.
- `lib/companies-house.ts` already fetches `/company/{n}/filing-history` and knows the account-type categories (full / small / micro-entity).

Financials follows the **identical pattern**: add financial columns to the cache, backfill them with a parser, and let `exploreWithFiling` filter on them.

## 1. Data source & fetch flow

All free, Open Government Licence, from Companies House:

1. **Filing history** — `/company/{number}/filing-history` (already used). Find the most recent `category: "accounts"` item.
2. **Document metadata** — that item's `links.document_metadata` (points at `document-api.company-information.service.gov.uk`). One GET, same Basic-auth key.
3. **Document content** — GET the metadata's `document` link with `Accept: application/xhtml+xml`. Modern accounts are **iXBRL** (XHTML with inline XBRL tags). Older/scanned ones are PDF only → skip (mark "not machine-readable").

Rate limits: CH is 600 req / 5 min (the same budget `backfill-filing.mjs` already respects). Each company costs ~2–3 calls (history + metadata + document), so backfill is throttled like the existing job.

## 2. What each account type yields (coverage matrix)

Coverage is **partial by design** — set expectations honestly:

| Accounts type | Turnover | Net assets / worth | Cash | Employees | Notes |
|---|---|---|---|---|---|
| Full / small (FRS 102) | Often | Yes | Yes | Sometimes | Best coverage |
| Micro-entity (FRS 105) | Rare | Yes | Yes | No | Balance-sheet only; most small/new cos |
| Dormant | No | Minimal | No | No | Effectively nothing → mark dormant |
| Filleted / abridged | Rare | Yes | Usually | No | P&L withheld |

So: **net worth + cash broadly available; turnover mainly for larger companies.** Many brand-new companies won't have filed accounts at all yet → `null` / "Not Assessed". This sharpens data *quality*, it doesn't add companies.

## 3. Parsing approach

iXBRL tags financial concepts inline using UK GAAP taxonomies (`uk-core`, `uk-bus`, FRS 101/102/105). Extract a **curated set of concepts by their standard element names**, choosing the latest reporting period (by `contextRef` period end):

- `TurnoverRevenue`
- `NetAssetsLiabilities` (→ net worth)
- `CashBankOnHand`
- `CurrentAssets`, `Creditors` / `CurrentLiabilities` (→ working capital, current ratio)
- `AverageNumberEmployeesDuringPeriod`
- Period end date + accounts type + made-up-to date (provenance)

Implementation: a small server-only parser (`lib/enrichment/financials.ts`) using an XML/HTML parser to read `ix:nonFraction` elements, matched on `name` (namespace-insensitive) and de-scaled by the `@scale`/`@sign`/`@decimals` attributes. Robust to missing tags → `null`. Evidence-first: every value carries its **filing date + period end**, or is "Not Assessed".

## 4. Data model

Add to `public.companies` (mirrors the filing-status columns), or a joined `company_financials` table if we want history across years. Start on `public.companies` for the latest snapshot:

```sql
alter table public.companies add column if not exists fin_turnover        bigint;
alter table public.companies add column if not exists fin_net_assets      bigint;
alter table public.companies add column if not exists fin_cash            bigint;
alter table public.companies add column if not exists fin_employees       integer;
alter table public.companies add column if not exists fin_accounts_type   text;   -- full | small | micro | dormant
alter table public.companies add column if not exists fin_period_end      date;   -- the accounts' made-up-to date
alter table public.companies add column if not exists fin_checked_at      timestamptz;  -- TTL like filing_checked_at
```

(Values are as-filed, GBP, whole pounds. A separate `company_financials` history table can come later for turnover-trend growth signals.)

## 5. Where it plugs in

- **Fetch/parse**: `lib/enrichment/financials.ts` (server-only, fenced enrichment layer — same ethos as `lib/enrichment/places.ts`: measured fact + source, or Not Assessed).
- **Backfill**: `scripts/backfill-financials.mjs` — clone of `backfill-filing.mjs`; same CH-rate-limit worker, writes the `fin_*` columns.
- **Filtering**: extend `exploreWithFiling()` (rename conceptually to "cache-backed filters") to accept `minTurnover`, `minNetWorth`, `hasAccounts`, `sizeBand` and read them from the cache — exactly as it does `accountsOverdue` today.
- **Company report**: a **Financials card** in `components/app/CompanyProfile.tsx`, populated from `lib/enrichment/financials.ts` on view (cached), with a "from filed accounts, period ending {date}" source line.
- **Provenance**: add a `SOURCES` entry (`lib/sources.ts`) — "Filed accounts (iXBRL), Companies House, OGL" — and a `/sources` "How the figures are computed" note.
- **Gating**: financials + size/health filters are natural **paid-tier** features (`caps` in `lib/subscription.ts`).

## 6. Phased build

1. **Phase 1 — prove it (report card).** Parser + on-demand fetch for one company → render a Financials card on the report. No cache, no filters. Validates parsing + value fast. _~2–3 days._
2. **Phase 2 — cache + filters.** Add `fin_*` columns + `backfill-financials.mjs` + size/health filters in `exploreWithFiling`. This is where the paid value lands (screen leads by size/health). _~3–5 days._
3. **Phase 3 — signals + history.** `company_financials` history table → turnover trend, growth flags; feed the growth-score idea. _later._

## 7. Caveats & risks

- **Coverage is partial** (micro/dormant thin; new cos may have no accounts). Always show "Not Assessed" rather than 0.
- **Taxonomy drift** — element names are stable across FRS versions but attributes (scale/sign) need careful handling; test across a sample of real filings.
- **PDF-only older filings** — skip; not machine-readable.
- **As-filed, not restated** — we report what the company filed, with the period date. Not audited-verdict; a *signal*, per the /sources "signals not verdicts" stance.
- **Backfill cost/time** — millions of companies × ~3 calls is a long throttled backfill; prioritise on-demand (viewed companies) + recent formations first.

## 8. Effort

Phase 1 is a contained, high-signal proof (~2–3 days). Phases 2–3 are where the competitive value compounds. The architecture is already proven by the filing-status cache, so risk is mostly in the parser robustness — which Phase 1 de-risks.

---

# Phase 2 — spec (cache + size/health filters)

_Extends Phase 1 (shipped). Two goals: (a) drop the per-request document fetch by caching, and (b) add size/health search filters — where the paid value lands._

## Architecture fit (why it's low-risk)

Phase 2 reuses **two patterns already in the codebase**:
- The **filing-status cache**: `public.companies` columns populated by `scripts/backfill-filing.mjs` + the ingest job.
- The **cache-backed filter path**: `lib/data.ts` `exploreWithFiling()` runs a live `explore()` (≈60 candidates by sector/region/recency), reads each candidate's cached fields (or fetches + writes on miss), then post-filters via `matchesFiling()`.

Financials is the same shape: cache the `fin_*` columns, and add a `matchesFinancial()` post-filter.

## 2a — Cache + report reads cache-first

1. **Migration** (add to `public.companies`):
   ```sql
   alter table public.companies add column if not exists fin_turnover      bigint;
   alter table public.companies add column if not exists fin_net_assets    bigint;
   alter table public.companies add column if not exists fin_cash          bigint;
   alter table public.companies add column if not exists fin_employees     integer;
   alter table public.companies add column if not exists fin_accounts_type text;
   alter table public.companies add column if not exists fin_period_end    date;
   alter table public.companies add column if not exists fin_checked_at    timestamptz;
   create index if not exists companies_fin_net_assets_idx on public.companies (fin_net_assets);
   create index if not exists companies_fin_turnover_idx   on public.companies (fin_turnover);
   ```
2. **`getCompanyFinancials(number)` becomes cache-first**: read the row; if `fin_checked_at` is fresh, return it (zero CH calls). On miss/stale, do the Phase-1 live fetch **and write the columns**. This removes the per-request document fetch that Phase 1 does on every company-page render — the operational concern flagged at ship.
   - **TTL**: long (≈120 days) — accounts are annual. Force a re-check when a new `accounts` filing appears (the ingest/streaming job already sees filing events; flag `fin_checked_at = null` on a new accounts filing so the next read re-parses).

## 2b — Size/health search filters

Extend the existing filter path — no new architecture:

1. **`FinancialFilters`** (alongside `FilingFilters` in `lib/data.ts`):
   ```ts
   interface FinancialFilters {
     minTurnover?: number; minNetWorth?: number; minCash?: number;
     minEmployees?: number; hasAccounts?: boolean; sizeBand?: "micro" | "small" | "mid";
   }
   ```
2. **`exploreWithFiling`** (rename conceptually to `exploreWithCache`): add `fin_*` to the batched `companies` select it already does; on cache miss for a candidate, call the cache-first `getCompanyFinancials`. Then a `matchesFinancial(result, filters)` post-filter, mirroring `matchesFiling`.
3. **UI**: add a "Financials" group to the search filter panel (the same component that exposes the accounts-overdue / due-soon filters today) — min turnover / min net worth / has-accounts / size band. Gated (see below).

### The one honest constraint (state it plainly)
This filters **within the live-search context** (the ≈60 candidates from sector/region/recency), exactly like the filing filters do today — not the entire register. That's the right fit for the product ("new **tech** companies **in London** with **£X+** net worth"), but it means there's no "every UK company over £Y turnover, ungated by sector" query. A true whole-register financial query would need a fully-backfilled cache queried directly — a later option, gated by backfill coverage.

## 2c — Backfill strategy (coverage, honestly)

Millions of companies × ~3 CH calls is a long, throttled job — **don't try to backfill the whole register.** Prioritise, in order:
1. **On-demand** — every company whose report is viewed caches itself (2a).
2. **Recent formations** — the product's focus; the ingest job already writes these rows, so add a financials pass for companies old enough to have filed first accounts (~9–21 months post-incorporation).
3. **Watchlisted / searched** companies.

`scripts/backfill-financials.mjs` clones `backfill-filing.mjs` (same 600-req/5-min throttle, `--limit`, `--stale`), calling the cache-first fetch and writing `fin_*`.

## Gating & provenance

- **Figures on the report**: keep **visible** (public) — they enrich the SEO pages and drive conversion (Phase 1 already does this).
- **Filtering by financials**: **paid** — it's the power feature. Add `caps.financials` to `lib/subscription.ts` (Team+), gate the UI controls + the filter path.
- **Provenance**: add a `SOURCES` entry ("Filed accounts (iXBRL), Companies House, OGL") and a `/sources` "How the figures are computed" note. Evidence-first labelling already in the card.

## Parser hardening

Phase 1's regex reader is proven on real filings but targeted. If coverage/accuracy dips at scale, swap `lib/enrichment/ixbrl-parse.ts` for a proper XML parser (e.g. `fast-xml-parser`) behind the same `parseIxbrlConcepts(xhtml)` signature — a contained change, no call-site churn. Add concepts as needed (current assets, creditors → current ratio; prior-year turnover → growth).

## Phasing & effort

| Step | What | Effort |
|---|---|---|
| 2a | Migration + cache-first `getCompanyFinancials` + ingest financials pass | ~2 days |
| 2b | `FinancialFilters` + `matchesFinancial` + search-panel UI + gating | ~3 days |
| 2c | `backfill-financials.mjs` + prioritised backfill | ~1–2 days |
| 3  | Multi-year history table → turnover trend + growth score | later |

**Sequence 2a first** — it removes the live-fetch cost and makes the report instant, independent of the filter work. 2b is where revenue-relevant value (screen leads by size/health) appears.
