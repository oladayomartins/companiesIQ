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
