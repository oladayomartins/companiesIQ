# CompaniesIQ — UI/UX audit

**Date:** 27 Aug 2026 · **Method:** local build walked in Chromium (Playwright + axe-core)
**Coverage:** 23 routes × 2 viewports (1440×900, 390×844) = 46 renders

Full illustrated version: https://claude.ai/code/artifact/3673bae6-c5cf-4224-a5e2-44be8db2fe8e

| | Count |
|---|---|
| Critical (P0) | 3 |
| High (P1) | 7 |
| Consistency (P2) | 6 |

The design system is sound. Almost every finding is a place where the system exists but a page
didn't use it, or where a breakpoint removes something and never replaces it.

---

## P0 — Critical

### CIQ-01 · Marketing nav disappears ≤980px with no replacement
`marketing.css:213` hides `.site-nav`; `:222` hides the header "Sign in" link ≤560px. No hamburger,
no drawer. At 390px the header is logo + "Get started" only — Product, Use cases, Industries, Data,
Pricing and Sign in are unreachable until the footer (8,104px down).

**Fix:** lift the working hamburger/drawer pattern from `AppShell` into `SiteHeader`. Also swap the
header CTA on `signedIn` (already computed, currently desktop-only).

### CIQ-02 · Horizontal overflow on every public/SEO page at phone widths
Document width **411px in a 390px viewport** on `/search`, `/city`, `/sic`, `/industry`,
`/industry/technology`, `/company/[number]`, `/free-alerts`. Offender: `.rep-head__cta` — logo +
"Sign in" + "Get full access →" in a fixed 64px non-wrapping row. On `/search` the "Sign in" link
wraps on top of the wordmark.

**Fix:** in `report.css` `@media (max-width:720px)` — `height:auto; min-height:56px; gap:12px`,
hide `.rep-head__link`, shorten the CTA label. Add `overflow-x:clip` on `.report-public` as a guard.

### CIQ-03 · Text contrast fails WCAG AA sitewide on the paper surface
46–87 failing nodes per marketing page (573 total across 10 routes). Root cause is six token values.
The dark "ink" surface already passes (muted 7.07:1, body 12.21:1, accent 5.86:1).

| Token | Now | Worst | Change to | Then |
|---|---|---|---|---|
| `--text-muted` | `#7A7065` | 4.16:1 | `#655C52` | 5.63:1 |
| `--text-faint` | `#948472` | 3.11:1 | `#726758` | 4.75:1 |
| `--accent` (as text) | `#D9531F` | 3.47:1 | `#B93E1E` | 4.79:1 |
| `--accent` (button fill) | white on `#D9531F` | 4.03:1 | white on `#C4471E` | 4.92:1 |
| `--pos` | `#2F7D5B` | 4.29:1 | `#2A7052` | 5.11:1 |
| `--warn` | `#B5821B` | 2.97:1 | `#8F6512` | 4.54:1 |

Split `--accent` into a fill colour and an `--accent-text` colour rather than darkening one value.

---

## P1 — High

### CIQ-04 · /pricing contradicts the homepage, hides Free, and the cards don't align
- The "Most popular" flag is in normal flow in the Team card only, pushing its contents down 38px.
  Plan names land at y=437/475/437, prices at 551/589/542, CTAs at 637/675/628.
- `MARKETING_TIERS` filters `free` out — but the homepage shows a "Free · £0" card, the hero says
  "No card required", and Analyst's first bullet is "Everything in Free".
- Homepage says `Pro · from £39/mo`; /pricing says `Analyst · £31/user/mo`; `ProGate` says "Pro
  feature". One plan, two names, two prices (£39 monthly / £31 annual).
- Three button styles in three adjacent cards (outline / orange / solid black) make Enterprise the
  highest-contrast target. Black isn't in the button system.

### CIQ-05 · Billing toggle has no accessible name (axe: `label`, critical)
`<Switch>` is rendered without its `label` prop on `/pricing` and `/app/upgrade`. Only
critical-severity violation on the site. Prefer a two-button radio group over a switch.

### CIQ-06 · 64 instances of `<Link><Button>` across 24 files
`<a>` wrapping `<button>` is invalid and yields a doubled a11y tree; the styled focus ring belongs
to an element that isn't the tab stop. **Fix:** make `Button` polymorphic (`as`/`asChild`), sweep
the call sites.

### CIQ-07 · Error states are dead ends and one is misleading
`/company/[number]` says "The register is busy right now… briefly rate-limits" when the real cause
was a missing API key. `/app` prints `COMPANIES_HOUSE_API_KEY is not set… to .env.local` to the
user. Neither offers retry, search or links out.

**Fix:** distinguish upstream failure from misconfiguration; never surface env var names or file
paths; give every error state an exit.

### CIQ-08 · App screens have no `<main>`, no `<h1>`, unlabelled account link
`landmark-one-main`, `page-has-heading-one` (`/app/companies`, `/app/insights`, `/app/watchlists`
lead with h2), `link-name` on the sidebar account arrow, `region` 3–15 blocks/screen. No skip link.
`aria-current` appears once in the whole codebase.

### CIQ-09 · Every text input is <16px → iOS Safari zooms on focus
`.hero__search input` 15px, `.topsearch input` 14px, `.ciq-input>input` 15px, `.enrich-input` /
`.editor-input` / `.qr-input` / `.prospects__new input` 13px. Hits the hero search and the app's
global search. **Fix:** `@media (max-width:768px){ input,select,textarea{font-size:16px} }`

### CIQ-10 · Inline prose links are colour-only
`link-in-text-block`: 11 nodes on `/about`, 7 on `/data`, 4 on `/contact`, 2 each on `/product` and
`/sources`. `tokens.base.css` sets `a{text-decoration:none}` globally. Underline links inside
running text only.

---

## P2 — Consistency

### CIQ-11 · A 12-step type scale that the pages ignore
**32 distinct hardcoded `font-size` values** across page CSS; the token scale is referenced in one
file (`ds-components.css`, 22 uses). Small-text drift: 9, 10, 10.5, 11, 12, 12.5, 13, 13.5, 14,
14.5, 15, 15.5, 16, 16.5, 17px. Display drift: 25–48px in twelve steps. Radii show the same pattern
(2, 3, 4, 6, 7, 12, 14, 16px raw against a 7-step scale). Start with `marketing.css` (230 lines).

### CIQ-12 · "5.5M" on marketing vs "5.3M" in the product
40 occurrences of "5.5M"; `AppShell`'s search placeholder says "Search 5.3M companies". Both should
read from `getRegisterKpis()` or one exported constant.

### CIQ-13 · The live KPI band degrades to four em-dashes
Each stat is `.catch(() => null)` → bare `—` in a 60px box. When the query fails, the section
labelled "Live from Companies House" shows nothing, four times, above the fold. Cache last-good
values with an as-of date, or hide the band.

### CIQ-14 · Homepage rhythm and alignment
- Left-aligned section heads, then a centred pricing teaser in a 760px box with a centred button —
  three alignments in one section.
- `.feat-grid` uses `gap:16px 40px` (row gap tighter than column gap).
- `.band` is fully styled and never used.
- 8,104px tall at 390px; every grid collapses to one column with no density change.

### CIQ-15 · No `prefers-reduced-motion`, no skip link
Zero occurrences of `prefers-reduced-motion` despite hover lifts, a permanent `rotate(0.4deg)` on
`.pv-frame`, card translations and toaster animation.

### CIQ-16 · The score breakdown is hidden in a `title` attribute
`ScorePill` exposes all four factors only via native `title` — invisible on touch, unreachable by
keyboard, inconsistent in screen readers, and invisible to anyone deciding whether to subscribe.

---

## What to adopt from FormationData

Read from their `/search` landing page and a full company report.

1. **Turn data into a judgement, at the top.** They open with a 60/100 gauge, a band ("Mixed
   indicators") and four named sub-scores. You already compute `ScoreBreakdown` — promote it out of
   the tooltip and make it the report header.
2. **Blur locked content, don't hide it.** Contact details, contracts, court listings render as real
   cards with blurred values and "Access details 🔒". `ProGate` currently replaces the whole screen —
   invert it.
3. **Derive every CTA from the record.** "Build lists of Business Consultancy companies", "…with
   filings due soon", "…with mortgages". `PublicCta` already takes `ctaLabel`; you have sector, city,
   SIC and dates on every report.
4. **Present absence of data as information.** "No awarded contracts found", "No court listings
   currently match this company name" — each a proper card. Every section should render in three
   states: has data, checked-and-empty, locked.
5. **Named risk flags in plain English,** plus a compliance checklist cross-referencing Companies
   House / ICO / HMRC AML / worker sponsor. You have charges, filings and PSCs — enough for "overdue
   accounts", "charge registered in the last 90 days", "no PSC declared".
6. **Search that declares its scope.** Four tabs above one box (Company / Director / Property /
   Contract — coming soon). You index companies, directors, SIC codes, cities and sectors: say so.
7. **Provenance at figure level.** "Last updated 14 May 2026", "Latest accounts to 31 Mar 2025",
   "Does this data look out of date? Click here to refresh." `/sources` is better than theirs —
   push that rigour down to individual tiles.
8. **Ordinary B2B trust signals.** Phone number in the header, customer logo strip, "Book a demo",
   live chat, data-accuracy disclaimer. Our trust line is entirely self-asserted.

**Don't copy:** their report is a long single column of loosely related cards with repeated CTA
banners. Our typography, palette and `/sources` are stronger. The gap is that they return a
*verdict* and we return a *record*.

---

## Sequence

| Block | Work | Findings |
|---|---|---|
| 1 · ~4h | Mobile menu, `.rep-head` overflow, six colour tokens, 16px touch inputs | 01, 02, 03, 09 |
| 2 · ~3h | Align tier cards, restore Free, unify Pro/Analyst, button hierarchy, label toggle | 04, 05 |
| 3 · ~3h | Polymorphic `Button` + sweep, `<main>`/h1/skip link, prose underlines, reduced motion | 06, 08, 10, 15 |
| 4 · ~2h | Real error states, one company-count constant, cached KPI fallback | 07, 12, 13 |
| 5 · ~1d | Promote `ScoreBreakdown` to the report header; blur-don't-hide locked sections | 16 + FD 1–2 |
| Ongoing | Close token drift, add axe to CI | 11, 14 |

**Add to CI:** `@axe-core/playwright` over six routes at two viewports plus an assertion that
`document.scrollWidth <= innerWidth` at 390px — about 40 lines, would have caught 11 of these 16.
