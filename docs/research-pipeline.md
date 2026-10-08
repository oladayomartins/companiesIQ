# Research pipeline

Automated, data-backed research reports built from exact Companies House
counts. Each edition is a normal blog post — plus the dataset that produced it,
served as CSV and JSON and declared as `Dataset` structured data.

## Why it is built this way

The value of these reports is that the numbers are *checkable*. Everything in
the design follows from that:

- **Exact counts, never estimates.** Every published figure is a hit count from
  the Companies House advanced search API. Sampling is used only to decide
  *which* rows to measure, never to produce a number.
- **A query ledger ships with the data.** Each figure records the endpoint and
  parameters that produced it, so a reader can re-run any single claim.
- **Caveats are enforced, not optional.** A study declares its limitations in
  the dataset; validation refuses to publish an article that doesn't state them.
- **The pipeline holds itself back.** Auto-publication happens only when every
  blocking check passes. Anything else is written as a draft and logged.

## Shape

```
lib/research/
  types.ts      Dataset / Study contracts
  collect.ts    metered Companies House client + query ledger
  periods.ts    settled-period arithmetic (a period is reportable only
                once it has ended plus a publication lag)
  charts.ts     inline-SVG charts + markdown tables
  targeting.ts  findings → actionable segments with links to live pages
  validate.ts   integrity + publication gates
  store.ts      dataset / post / run-log persistence
  publish.ts    collect → validate → render → publish or hold
  schema.ts     Dataset + Report structured data
  studies/      one file per study
```

## Running it

Scheduled: `vercel.json` hits `/api/cron/research` weekly. Most weeks every
study is inside its refresh window and the job does nothing.

Manually:

```bash
node scripts/research/run.mjs --dry                   # collect + validate, publish nothing
node scripts/research/run.mjs --study sic-formations  # one study
node scripts/research/run.mjs --force                 # ignore the refresh window
```

Endpoint parameters: `?study=`, `?dry=1`, `?force=1`. Authorisation is
`INGEST_SECRET`/`CRON_SECRET` as with the other cron routes; a local dev server
accepts an unauthenticated call.

Database objects live in `supabase/research.sql` (`research_datasets`,
`research_runs`) — apply once.

## Adding a study

Implement the `Study` contract and register it in `lib/research/studies/index.ts`:

- `periods(now)` — the settled periods that should have an edition, newest first.
- `collect(period, comparison)` — take exact counts through a `Collector` and
  return a `Dataset`, including `method` notes and `caveats`.
- `render(dataset)` — build the article. **Every number must come from the
  dataset.** Prose that asserts a figure the dataset doesn't hold is a bug.

The scheduler, CLI, CSV/JSON endpoints, structured data and validation all
pick it up from the registry.

## Validation gates

Blocking (holds publication):

- period total is zero, or fewer than 10 ranked rows;
- a row exceeds the period total, or is negative/non-finite;
- monthly counts don't sum to the period total within 1%, or a month is empty;
- year-on-year change beyond ±40% (a swing that large means a broken query,
  not a market shift);
- a declared caveat missing from the article;
- an internal link that doesn't resolve, an unrendered `NaN`/`undefined`,
  a meta description over 155 characters, a missing methodology section or
  missing licence attribution.

Warnings are recorded but don't hold an edition.

## Editorial rules

- British English; answer-first opening; no padding.
- Say what the data cannot show as plainly as what it can. Registrations are not
  trading businesses; registered offices are not places of business; SIC shares
  do not sum to 100%.
- Percentage changes are suppressed below a volume floor per study.
- Attribute Companies House under the Open Government Licence and invite reuse
  with a link.

## Commercial Opportunity series

`studies/commercial-opportunity.ts` is a study *template*: one quarterly edition
per market defined in `lib/research/markets.ts` (study id `opportunity-<market>`,
slug `commercial-opportunity-<market>-<period>`). Each edition answers: how many
new companies in the market (codes queried together — Companies House treats
repeated `sic_codes` as "any of" and de-duplicates), where (39-city census with
the Cardiff default-address correction), how long they last (five-year survival
vs all companies), and who sells into it (editorial, from `markets.ts`). Every
edition ends in a "Build this market" link: a `/search` preset with the market's
codes and name (`?sic=69201,69202&name=New+accountancy+firms`).

To add a market, append to `MARKETS` — codes, a display name and in-sentence
noun, the buyer table and a timing paragraph. The buyer copy is reviewed like any
other copy and must never state a statistic. ~56 register queries per edition;
market-level year-on-year moves are held for review beyond ±75%.
