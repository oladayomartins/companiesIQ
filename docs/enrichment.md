# Phase 2 — Digital-Presence Enrichment Pipeline (spec)

_Status: **approved direction, not built.** Companion to `docs/architecture.md`. Do not commit (per owner instruction)._

Decision (owner): **Claude hybrid** — Claude (grounded with web tools) for website + AI-visibility;
Google Places for GBP + reviews. Everything measured, cited, cached. Never invented.

This is the data source that makes the **DigitWarehouse Founder Funnel** Section 3 ("what competitors
are doing") evidence-based. It is the **enrichment layer** — fenced off from the CompaniesIQ
intelligence layer (Companies House / ONS / Nomis), with its own source labels.

---

## 0. Hard rule

Every enriched value is one of:
- a **measured fact** with `{value, source, checkedAt}` (a fetched URL / API response + date), or
- **`"Not Assessed"` / `"Unknown"`** when not measured.

No LLM "knowledge" answers. Claude is only ever used **grounded** (web_search / web_fetch results it
just fetched, with citations) — never asked "do you think X has a website?". An ungrounded answer is a
hallucination and is banned.

---

## 1. What gets measured (per company)

| Signal | Source | Method |
|---|---|---|
| Website exists + URL | **Claude (web_search/web_fetch)** | Search "{name} {town}", verify a plausible official site; capture URL as citation |
| Google Business Profile exists | **Google Places API** | Place lookup by name+locality → `place_id` present |
| Reviews (count + rating) | **Google Places API** | `user_ratings_total`, `rating` from Place Details |
| Local search presence | **Google Places** (+ optional SERP provider) | Appears in Places/Maps results for category+area |
| AI / LLM visibility | **Claude (the LLM itself)** | Ask an LLM to recommend "{category} in {town}"; check if the company surfaces. The LLM is the measurement instrument here. |
| Social presence (optional) | Claude web_search | Lower confidence; mark clearly |

Anything not returned → `"Not Assessed"`.

---

## 2. Claude API config (verified against current reference)

**SDK:** `@anthropic-ai/sdk` (already a dep; `ANTHROPIC_API_KEY` already wired in `lib/nl-search.ts`).

**Web tools (server-side, return citations):**
```ts
tools: [
  { type: "web_search_20260209", name: "web_search" },  // dynamic filtering built in on Opus/Sonnet 4.6+
  { type: "web_fetch_20260209",  name: "web_fetch"  },
]
```
- Optional: `max_uses` to cap searches/company (cost control), `allowed_domains` to bias official sources.
- Server-side tool loops can return `stop_reason: "pause_turn"` — re-send to resume (see SDK loop pattern).

**Structured output (canonical param):**
```ts
output_config: { format: { type: "json_schema", schema: ENRICHMENT_SCHEMA } }
```
Supported on Opus 4.8 / Sonnet 4.6 / Haiku 4.5. (Use `messages.parse()` + a Zod schema in TS.)

> ⚠️ **Compatibility caveat:** structured outputs are documented as **incompatible with citations** (400).
> Web-search results carry citations, so do **not** force `output_config.format` on the *same* call that
> runs web_search. Use the **two-step pattern** below.

### Two-step pattern (robust, recommended)
1. **Gather (grounded):** one agentic call with `web_search` + `web_fetch`, model **Sonnet 4.6**, no forced
   format. It returns prose + the URLs/citations it used. Capture the raw text + cited URLs.
2. **Extract (structured):** a cheap **Haiku 4.5** call with `output_config.format` that turns step-1's
   gathered evidence into the strict JSON schema, copying through the source URLs. No web tools here.

This sidesteps the citations×structured-output conflict, keeps the expensive web step separate from the
cheap extraction step, and makes the output deterministic and storable.

### AI-visibility probe (separate, no web tools)
Ask Sonnet 4.6 (optionally also a non-Claude LLM later) a neutral consumer prompt — *"Recommend
{category} businesses in {town}, UK"* — and check whether the subject surfaces. Record verbatim prompt,
model, date, and whether-mentioned. This is the one metric where the LLM legitimately *is* the data.

---

## 3. Models & cost (cached pricing 2026-05-26)

| Model | $/1M in | $/1M out | Use |
|---|---|---|---|
| Haiku 4.5 `claude-haiku-4-5` | $1.00 | $5.00 | Step-2 structured extraction |
| Sonnet 4.6 `claude-sonnet-4-6` | $3.00 | $15.00 | Step-1 grounded gather + AI-visibility probe |
| Opus 4.8 `claude-opus-4-8` | $5.00 | $25.00 | Not needed for enrichment |

- **Web search is billed per use** (separate from tokens) — confirm the current per-search rate on the
  pricing page before finalising the cost model; cap with `max_uses`.
- **Google Places**: Place Details (with reviews/rating fields) is a paid SKU — confirm current per-call
  pricing + the free monthly credit in Google Cloud billing.
- **Cost scales as competitors × signals.** This is why caching (below) is mandatory: enrich each company
  **once**, reuse across every report that references it.

**Rough envelope (validate with a 10-company trial before committing):** per company ≈ 1 Sonnet gather
(few web searches) + 1 Haiku extract + 1 Places Details call + 1 Sonnet AI-visibility probe. A funnel page
showing a "sample of N competitors" enriches N companies once, then competitor averages are computed from
cache for free on subsequent views.

---

## 4. Data model (Supabase)

```
company_enrichment
  company_number    text primary key
  website_url       text        null
  website_source    text        null   -- cited URL
  gbp_present        boolean     null
  review_count      int         null
  review_rating     numeric     null
  gbp_source        text        null   -- Places place_id / details URL
  ai_visible        boolean     null
  ai_probe          jsonb       null   -- {prompt, model, mentioned, date}
  social            jsonb       null
  checked_at        timestamptz
  ttl_days          int         default 30   -- re-enrich when stale
  raw              jsonb        null   -- full evidence blob for audit
```
RLS: world-readable (like the register tables); written only by the service role (the enrichment job).
Treat `checked_at` + `ttl_days` as the cache key — skip companies enriched within TTL.

---

## 5. Competitor averages (the funnel hook, kept honest)

For a subject's SIC + region:
1. Take the Similar Companies set (already built in Phase 1).
2. Ensure each is enriched (enqueue any stale/missing).
3. Compute "% with website / GBP / reviews / AI-visible" **over the companies actually measured**, and
   **display the sample size + date**: *"82% of 40 sampled {sector} companies in {region} have a website
   (measured {date})."*
4. Subject's Visibility Gap = subject's measured signals vs that sample average; unmeasured → "Not Assessed".

Never extrapolate beyond the measured sample; never round a 0/0 into a percentage.

---

## 6. Execution shape

- An **enrichment job** (API route + queue, reusing the existing ingest/worker pattern in `worker/` +
  `vercel.json` crons) enriches companies asynchronously and writes `company_enrichment`.
- The report/funnel reads cache only; if a company is unenriched it shows "Not Assessed" and enqueues it.
- Secrets (`ANTHROPIC_API_KEY`, `GOOGLE_PLACES_API_KEY`) stay server-side (per `SECURITY.md`); never client.
- Rate-limit + back off (CH-style); `max_uses` on web_search; batch Haiku extractions where possible.

---

## 7. Build order (Phase 2, enrichment slice)

1. Schema + `company_enrichment` table + service-role writes.
2. `lib/enrichment/places.ts` — Google Places: GBP present, reviews, rating.
3. `lib/enrichment/web.ts` — Claude two-step (Sonnet gather → Haiku extract) for website.
4. `lib/enrichment/ai-visibility.ts` — Claude AI-visibility probe.
5. `lib/enrichment/index.ts` — orchestrate + cache + TTL; one `enrichCompany(number)`.
6. Wire **Digital Presence Readiness** (subject) + funnel **competitor averages** to the cache.
7. 10-company trial → measure real cost → tune sample size, TTL, `max_uses`.

> Phase 2 also covers founder-mode route, QR tracking, PDF, lead capture, packages — see
> `docs/architecture.md` §4. This file is the enrichment-data slice only.

---

## 8. Open items to confirm before coding

- Current **web_search per-use price** and **Google Places Details price** + free tiers (cost model).
- **Google Cloud project + Places API key** provisioning.
- Sample size **N** per report and **TTL** (cost vs freshness).
- Whether to add a **second, non-Claude LLM** to the AI-visibility probe later (broader "AI recommendations"
  claim) — start Claude-only, expand if the claim needs it.
