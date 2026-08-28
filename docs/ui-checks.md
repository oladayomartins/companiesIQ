# UI regression checks

`npm run check:ui` walks a slice of the site in a real browser and fails on
accessibility or layout regressions. It runs in CI on every PR, after the build.

## What it checks

| Check | Rule |
|---|---|
| Accessibility | axe-core, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `best-practice` — zero violations |
| Landmarks | exactly one `<main>` per page |
| Headings | exactly one `<h1>` per page |
| Layout | `document.scrollWidth <= clientWidth` at 320, 390, 768 and 1440px |

14 routes across the marketing site, the public/SEO pages, the gated app and the
404 — 70 renders. Routes doing heavy third-party data work (`/city`,
`/industry/[sector]`, `/company/[number]`) are excluded: they are slow and flaky
without API keys and share their chrome with routes that are covered.

## Why it runs against `next start`, never `next dev`

Two reasons, both learned the hard way:

1. The dev server injects an error overlay that trips the contrast and landmark
   rules, producing failures that don't exist in production.
2. More importantly, **dev hides pages whose server HTML is empty.** `/sign-in`
   passed every check in dev while shipping a blank document to crawlers — a
   `<Suspense fallback={null}>` wrapped the whole page, so there was no `<main>`,
   no `<h1>` and no copy until hydration. Only the production build showed it.

## Running it locally

```bash
rm -rf .next        # see the caching note below — do not skip this
npm run build
npm start &
npm run check:ui
```

**Clear `.next` first.** A warm build cache can serve a stale stylesheet when the
only change is inside a file that `globals.css` `@import`s: `next build` exits 0
and the previous CSS still ships. An injected contrast regression passed this
gate until the cache was cleared. CI checks out fresh, so it is unaffected — but
a local "it passes" is not trustworthy without the `rm -rf`.

## Options

| Env var | Use |
|---|---|
| `BASE_URL` | server to test (default `http://localhost:3000`) |
| `ROUTES` | comma-separated subset, e.g. `ROUTES=/,/pricing` when chasing one failure |
| `PLAYWRIGHT_CHROMIUM_PATH` | browser binary, for images that ship their own Chromium |

## When it fails

Output names the route, the kind of problem, and for overflow the specific
element and how far past the viewport it sits:

```
/  [a11y]  serious · color-contrast · 1 node(s) — <p class="hero__sub">…
/  [overflow @320px]  document is 716px wide — DIV.hero__trust → right 716
```

Fix the cause rather than trimming the route list. The findings this gate exists
to catch are recorded in `ui-ux-audit-2026-08.md`; 11 of those 16 would have been
caught here before they shipped.
