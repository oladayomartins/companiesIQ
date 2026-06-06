# CompaniesIQ

**UK Business Formation Intelligence Platform** — turns the public business register
into market intelligence you can search, track and trust.

Built with Next.js (App Router, TypeScript), the CompaniesIQ design system, the live
Companies House REST API, and Supabase. Implements the "hybrid" brand direction from
the Claude Design handoff: a light **editorial** marketing surface and a dark
**data-terminal** app surface, driven by one warm token set.

**Shipping:** see [DEPLOYMENT.md](DEPLOYMENT.md) for the Vercel + Supabase + cron/worker
guide and [SECURITY.md](SECURITY.md) for the security review and hardening notes.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in keys (all optional for a demo run)
npm run dev                  # http://localhost:3000
```

### Always-on ingestion worker (optional)

In addition to the Vercel cron, a standalone worker can drive the 5-minute
collection cadence on any always-on runtime (VM, container, Railway, Fly.io,
systemd). It just calls the app's own `/api/ingest` + `/api/alerts/run`, so all
logic stays in one place:

```bash
APP_URL=https://app.companiesiq.co.uk INGEST_SECRET=… npm run worker
```

Tune with `WORKER_INTERVAL_MS` (default 300000) and `WORKER_RUN_ALERTS=false`.

The app is **live-only** — all company data comes from the Companies House REST API.
A `COMPANIES_HOUSE_API_KEY` (free) is required; there is no seed/sample data. The other
keys (Supabase, Anthropic, Resend) are optional and unlock auth/persistence, AI search,
and email respectively. **Regional indicators (population, employment, economic activity,
median pay) are pulled live from the free Nomis/ONS API** (`lib/nomis.ts`, no key needed).
Business-survival rates and sector population totals remain published ONS reference figures
(annual spreadsheet releases with no JSON API), clearly sourced in the UI. The full provenance
of every figure — live vs. reference, provider, licence — is on the **[/sources](app/(marketing)/sources/page.tsx)**
page (driven by `lib/sources.ts`).

### Environment

| Variable | Purpose | Required? |
|---|---|---|
| `COMPANIES_HOUSE_API_KEY` | Live company search, profiles, officers, filings, charges, PSCs, dashboard/analytics counts. Free key from [developer.company-information.service.gov.uk](https://developer.company-information.service.gov.uk/). | **Required** (no seed data) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth, watchlists, saved searches, ingested register. | Optional — sign-in shows "demo mode" without it |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side ingestion writes. | Optional |
| `INGEST_SECRET` | Protects the `/api/ingest` cron endpoint. | Optional |

To enable persistence, run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor.

---

## What's built (Phase 1 MVP)

| Function | Where |
|---|---|
| **Marketing site** — editorial landing + pricing | `/`, `/pricing` |
| **Company discovery** — faceted search/filter over the live register | `/app/search` |
| **Company profile** — header, KPIs, Overview / People (officers + PSCs) / Filing history / Charges | `/app/company/[number]` |
| **Company Intelligence Report** — the flagship 8-section market briefing | Intelligence tab on each profile |
| **Trend dashboards** — incorporation trends, sector breakdown, fastest-growing sectors | `/app/analytics` |
| **Industry intelligence** — sector stats, survival benchmarks, regional growth | `/app/industries`, `/app/industries/[sector]` |
| **Dashboard** — KPI tiles, watchlist movers, signal feed | `/app` |
| **Auth & subscriptions** — magic-link sign-in, freemium tiers | `/sign-in`, `lib/subscription.ts` |
| **Ingestion engine** — cron target that classifies new incorporations | `GET /api/ingest` |

### The engines (`lib/`)

- **`sic.ts`** — SIC 2007 code → readable category + sector + division (the classification engine).
- **`geography.ts`** — postcode area → ONS region + nation (the geographic engine).
- **`companies-house.ts`** — typed client over the Companies House REST API.
- **`ons.ts`** — ONS/Nomis reference baselines (survival rates, sector population, regional indicators).
- **`analytics.ts`** — the intelligence layer: builds the 8-section report and trend series.
- **`keywords.ts`** — keyword intelligence engine: extracts commercial themes from names + SIC + filings; aggregates trending signals.
- **`scoring.ts`** — opportunity scoring engine: transparent 0–100 blend of industry demand + growth + location + keyword signals.
- **`alerts.ts`** — standing alert rules + the pure matching predicate.
- **`directors.ts`** — director / serial-founder intelligence from officer appointments.
- **`nl-search.ts`** — natural-language query parser (rule-based; Claude Haiku when keyed).
- **`data.ts`** — single (live-only) data-access entry point; enriches Companies House results with keywords + scores.
- **`live-stats.ts`** — real register aggregates (active/new/dissolved counts, monthly incorporation trend, recent listings, trending signals) for the dashboard + analytics.
- **`nomis.ts`** — live Nomis/ONS regional indicators (population, employment rate, economic activity, median weekly pay) for the report's economic section + discover hotspots; daily-cached, falls back to ONS reference baselines.

### Intelligence & lead-gen layer (Hybrid)

Evidence-first core with opt-in lead-gen modules surfaced as **Pro** features:

| Capability | Where |
|---|---|
| **Keyword signals** — trending themes (AI, Fintech, Solar…) | chips in the explorer + Analytics "Trending signals" |
| **Opportunity score (0–100)** — transparent, with component breakdown | `Opportunity` column in the explorer + a lead-lens card on each report |
| **Working prospect export** — real CSV of the current result set | export buttons in `/app/search` |
| **Wired filters** — status, region, incorporation window actually query | `/app/search` |
| **Alerts engine** — standing rules → webhook / Slack (real POST) / email (Resend) | `/app/signals`, `POST /api/alerts/run` |
| **PSC (persons with significant control)** — ownership + nature-of-control on each profile | People tab → "Persons with significant control" |
| **Director / serial-founder intelligence** — cross-company appointments, prolific-director detection | `/app/director/[id]`, People tab on each profile |
| **AI / NL discovery** — natural-language search + emerging niches + regional hotspots | `/app/discover`, `GET /api/discover` |
| **Schedulers** — 5–15 min ingestion + alert evaluation | `vercel.json` crons → `/api/ingest`, `/api/alerts/run` |

> Per the chosen direction, lead-scoring/exports/alerts are presented as opt-in Pro modules
> over the evidence-first intelligence core — not the default surface. Scores are a transparent
> weighted blend (shown with their components), not a black-box prediction.

---

## Design system

The UI is a faithful, production recreation of the **CompaniesIQ design system** (Claude Design
handoff). Tokens live in `app/styles/tokens.*.css` (warm orange + warm neutrals — no cool grey,
no gradients, no purple). Primitives (`Button`, `Card`, `Badge`, `Stat`, `Tag`, `CompanyAvatar`,
`Input`, `Select`, `Checkbox`, `Switch`, `Tabs`, `Icon`) are TypeScript ports in `components/ds/`.

- **Light "paper"** surface = marketing + reports.
- **Dark "ink"** surface = the app (`class="ciq-dark"`).
- Type: Newsreader (editorial), Archivo (app display), Hanken Grotesk (body), IBM Plex Mono (all data).
- **Charts** use Recharts themed to the tokens (`components/app/Charts.tsx`); the explorer offers
  an optional **AG-Grid** "Grid" view (`themeQuartz` mapped to the warm-ink palette) alongside the
  default design-system table.

### Provenance & substitutions (per the design handoff)
- Fonts are Google-Fonts stand-ins (Archivo / Hanken Grotesk / Newsreader / IBM Plex Mono).
  Send licensed brand fonts to self-host.
- Icons are Lucide (ISC), redrawn as inline SVG in `components/ds/Icon.tsx`.
- ONS/Nomis figures are seeded from published releases as reference baselines and are
  clearly sourced in the UI. Live company data comes from Companies House under the
  Open Government Licence.

---

## Principles (carried from the product blueprint)

1. **Evidence first** — every figure is real or sourced; nothing fabricated.
2. **Transparency** — each report block cites Companies House / ONS / Nomis.
3. **Simplicity** — the story over the spreadsheet.
4. **Independence** — valuable whether or not you buy anything.

> Data © Crown copyright, Companies House. Reused under the Open Government Licence.
