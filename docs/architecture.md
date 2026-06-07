# CompaniesIQ — Product Architecture & Implementation Plan

_Last updated: 2026-06-07. Status: **plan approved, build not started.**_

This document is the single reference for how the three product components fit together,
and the phased plan to build them. **The #1 rule: do not mix the three components.**

---

## 0. The three components (and their boundaries)

| # | Component | Route(s) | Purpose | Tone |
|---|-----------|----------|---------|------|
| 1 | **CompaniesIQ Core Platform** | `/app/*` | Neutral UK business intelligence | Factual, source-backed |
| 2 | **CompaniesIQ Company Report** | `/app/company/{id}` | The report every user sees | Neutral, educational |
| 3 | **DigitWarehouse Founder Growth Report** | `/app/company/{id}/growth-report?source=digitwarehouse` | Founder-acquisition funnel (QR) | Conversion-focused |

They are **related but not the same**. (3) is a *presentation mode* of (2), not a separate system.

### Non-negotiable data rules (apply to ALL three)
CompaniesIQ must **never** show:
- Revenue estimates
- AI "success" predictions
- Hot / Warm / Cold scoring
- Lead scores
- Speculative opportunity scores

Everything is factual and source-backed. If a fact is unknown → **"Not Assessed" / "Unknown"**, never an assumption.
(We already removed scoring/lead language in prior work — keep it out.)

### Partner governance (the IP boundary)
**CompaniesIQ owns all intelligence.** Partners — including DigitWarehouse — operate on top of it:
- Partners **MAY** customize: **branding, CTAs, booking links, packages.**
- Partners **MAY NEVER** modify: **data, statistics, market insights, or report conclusions.**

The intelligence layer is single-source and CompaniesIQ-controlled; partner config is presentation-only.

---

## 1. One report engine (the most important architectural decision)

There is **ONE** report and **ONE** source of truth.

```
/app/company/{id}                                  → Standard mode (default)
/app/company/{id}/growth-report                    → Founder mode (same data, different presentation)
/app/company/{id}/growth-report?source=digitwarehouse  → DigitWarehouse QR funnel (tracked)
```

**Do NOT build** `/startup-briefing/{id}` or any parallel report. That would create two reports,
two databases, two systems, two sources of truth. All modes read the **same** report data object
(`buildIntelligenceReport()` + enrichment) and only differ in *rendering*.

- Standard mode → audience: investors / analysts / researchers / subscribers. Neutral.
- Founder mode → audience: newly-incorporated owners. Conversion framing, same facts.
- DigitWarehouse → founder mode + branding/packages/CTA + QR tracking. Lives **inside this repo**;
  DigitWarehouse only supplies branding config (logo, packages, booking link).

Implementation shape:
- `lib/report.ts` (or extend `lib/analytics.ts`) returns the canonical report data.
- `components/app/IntelligenceReport.tsx` = standard presentation.
- `components/app/GrowthReport.tsx` (Phase 2) = founder presentation of the same data.
- A `mode`/`source` prop selects presentation + which branding config to load. Data path is shared.

---

## 2. Data layer

### Core sources (intelligence layer — CompaniesIQ controlled)
- **Companies House**: registrations, SIC, incorporation dates, status, type, location.
- **ONS**: survival rates, industry growth, economic indicators (reference baselines).
- **Nomis**: employment, population, regional economics (live).
- **Gov open data**: business population estimates, industry stats.

### Enrichment layer (NEW — Phase 2, clearly fenced from the intelligence layer)
Needed for Digital Presence Readiness + the funnel's "what competitors are doing" hook,
because **none of this is derivable from CH/ONS/Nomis**. Approved direction: integrate a real source.
- Website existence/quality (HTTP/DNS + basic checks)
- Google Business Profile + reviews (Google Places API)
- Local search / SERP presence, AI/LLM visibility (e.g. DataForSEO or equivalent)

**Methodology that keeps it evidence-based:** for a company's SIC+region, take a sample of N similar
companies, measure each, and report "X% of N sampled competitors have a website". Always disclose the
sample size and date. Anything unmeasured → "Not Assessed". Never invent a percentage.

> Enrichment data must be visibly separated from the intelligence layer (its own source label,
> e.g. "Derived · DigitWarehouse enrichment, sample of N") so the neutral platform stays credible.

---

## 3. Phase 1 — Core platform + standard report (LAUNCH)

All within the existing engine at `/app/company/[number]`. No founder mode, no funnel yet.

### 3.1 Intelligence tab — target section order
(`components/app/IntelligenceReport.tsx` + `lib/analytics.ts`)

| New § | Title | Source today | Action |
|------|-------|--------------|--------|
| 1 | **Market Summary** | the at-a-glance strip already added | Formalise as a titled top section: Industry · Market size · New registrations · Growth rate · Survival rate |
| 2 | Business Overview | §1 | keep |
| 3 | Industry Snapshot | §2 | keep |
| 4 | **Competition Snapshot** | §3 "Local market analysis" | **rename**; fields: Similar companies · New entrants · Market density · Regional concentration |
| 5 | **Growth & Survival** | §4 survival + §5 regional growth | **merge** into one section |
| 6 | Local Economic Indicators | §6 | keep (Nomis) |
| 7 | Industry Trends | §7 | keep |
| 8 | Market Outlook | §8 | keep (evidence-based) |
| 9 | **Startup Readiness** | — | **NEW**, educational checklist, status "Not Assessed" (bank account, accounting, email, website, insurance, record-keeping) |
| 10 | **Digital Presence Readiness** | — | **NEW**, status "Unknown"/"Not Assessed" (website, GBP, email, social, reviews) |
| 11 | **Similar Companies** | — | **NEW**: same SIC + same region list (feasible now via `advancedSearch({ sicCodes, region })`) |

Tabs unchanged: **Intelligence / Overview / People / Filing History / Charges**.

### 3.2 Phase 1 work items
1. Rename §3 → "Competition Snapshot" (label + the analytics field naming).
2. Merge §4 + §5 → "Growth & Survival" (combine the two cards, keep both source lines).
3. Add §1 "Market Summary" as a proper section (reuse the at-a-glance metrics).
4. Add §11 "Similar Companies" — new query + card (links to each company's report).
5. Add §9 "Startup Readiness" + §10 "Digital Presence Readiness" — placeholder/"Not Assessed" cards
   (no enrichment yet; copy is educational, not sales).
6. Keep everything neutral; verify no scoring/lead language reappears.

**Acceptance:** standard report shows 11 sections in order; Similar Companies returns real same-SIC/region
rows; readiness sections render honest placeholders; `tsc` + build clean; no console errors.

---

## 4. Phase 2 — Founder mode + DigitWarehouse funnel

1. **Founder mode** route `/app/company/[id]/growth-report` — reuses the report data, founder presentation.
2. **Enrichment pipeline** (the new data layer in §2) — powers Digital Presence Readiness (subject company)
   and the funnel's competitor-average section.
3. **QR campaign tracking** — `?source=digitwarehouse` → record scans, letter performance, conversions.
4. **PDF download** — gated behind lead capture.
5. **Lead capture** — first name, last name, email, phone + **email verification**, then PDF.
6. **DigitWarehouse packages** — Launch £500 / Growth £1,000 (recommended) / Visibility £1,500.
7. **Book consultation** — "Book a Free Visibility Review" (30 min).

### Funnel landing structure (founder/DigitWarehouse presentation)
1. Welcome — company name · industry · region (no fluff)
2. Local Competition Snapshot — competitor count · new entrants · industry growth · market density (the hook)
3. **What Competitors Are Doing** — % with website/GBP/reviews/local search/AI (the conversion driver; **needs enrichment**)
4. Visibility Gap Analysis — Your Business vs Competitor Average; unknowns → "Not Assessed"
5. Why This Matters — short, educational, no sales language
6. Growth Roadmap — website · GBP · citations · reviews · service pages · AI visibility
7. DigitWarehouse Packages — the three tiers above
8. Download Full Report — lead capture + email verification → PDF
9. Book Consultation — CTA

---

## 5. Phase 3 — White-label SaaS (future, not V1)

After DigitWarehouse validates the model: let other businesses (SEO agencies, recruiters, accountants,
insurance brokers, consultants) generate their own growth report at `/app/company/{id}/growth-report`
with **their** logo / CTA / booking link / packages — but they **cannot** modify market intelligence,
statistics, data, or insights. CompaniesIQ retains the intelligence layer. Add a QR generator for subscribers.

---

## 6. Priority order

- **Phase 1 (Launch):** Core platform → Standard report → Intelligence tab improvements → Similar Companies → Startup Readiness → Digital Presence Readiness.
- **Phase 2:** Founder mode → QR tracking → PDF → Lead capture → DigitWarehouse packages.
- **Phase 3:** White-label growth reports → QR generator → Partner branding → Growth-tier SaaS.

---

## 7. Open dependencies / decisions to resolve before Phase 2

- **Enrichment API keys + budget**: Google Places API (GBP/reviews), SERP/AI-visibility provider
  (e.g. DataForSEO), and the sampling cadence (cost scales with sample size × companies).
- **Lead-capture storage + email verification**: Supabase tables + a verification email flow (Resend already wired).
- **PDF generation**: server-side renderer for the gated report download.
- **DigitWarehouse branding config**: where logo/packages/booking link are defined (config in-repo).
