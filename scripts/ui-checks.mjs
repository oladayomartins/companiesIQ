// ============================================================
// UI regression checks — accessibility and layout, against a real build.
// ------------------------------------------------------------
// Catches the class of defect that shipped before: text below the WCAG AA
// contrast threshold, pages that scroll sideways on a phone, missing landmarks
// and headings, controls with no accessible name.
//
// Run against `next start`, never `next dev`. The dev server injects an error
// overlay that trips the contrast and landmark rules, and — more importantly —
// dev renders some Suspense boundaries eagerly enough to hide the fact that a
// page's server HTML is empty. /sign-in passed in dev while shipping a blank
// document to crawlers; only the production build showed it.
//
//   npm run check:ui                 # assumes a server on :3000
//   BASE_URL=http://localhost:3001 node scripts/ui-checks.mjs
//
// Locally, `rm -rf .next` before the build. A warm .next can serve a stale
// stylesheet when the only change is inside a file that globals.css @imports —
// `next build` exits 0 and the old CSS still ships. This bit during testing:
// an injected contrast regression passed the gate until the cache was cleared.
// CI checks out fresh, so it is not affected.
//
// PLAYWRIGHT_CHROMIUM_PATH overrides the browser binary, for images that ship
// their own Chromium instead of letting `playwright install` fetch one.
// ROUTES=/,/pricing narrows the run when chasing one failure.
// ============================================================
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";

// A representative slice of each surface rather than every route: the marketing
// site, the public/SEO pages, the gated app, and the 404. Routes doing heavy
// third-party data work (/city, /industry/[sector], /company/[number]) are left
// out — they are slow and flaky without API keys, and they share their chrome
// with routes that are covered.
const ROUTES = process.env.ROUTES?.split(",").map((r) => r.trim()).filter(Boolean) || [
  "/",
  "/pricing",
  "/product",
  "/about",
  "/sources",
  "/blog",
  "/sign-in",
  "/search",
  "/sic",
  "/free-alerts",
  "/app",
  "/app/upgrade",
  "/app/watchlists",
  "/not-a-real-page",
];

// 320 is the narrowest width worth supporting; 1440 is where axe runs.
const WIDTHS = [320, 390, 768, 1440];
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

const failures = [];
const fail = (route, kind, detail) => failures.push({ route, kind, detail });

// The pages <link> a render-blocking Google Fonts stylesheet. Letting every
// render wait on a third party makes the gate slow and, worse, flaky for
// reasons that have nothing to do with the diff — so external requests are
// aborted and the checks run against the local origin only. Contrast and
// layout are unaffected: the fallback stacks are declared, and every metric
// here comes from computed styles rather than the webfont file.
async function isolate(page) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    const local = url.startsWith(BASE) || url.startsWith("data:") || url.startsWith("blob:");
    return local ? route.continue() : route.abort();
  });
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});

try {
  // ---- Accessibility, at desktop width -------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30_000);
    await isolate(page);
    for (const route of ROUTES) {
      await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      for (const v of violations) {
        fail(route, "a11y", `${v.impact} · ${v.id} · ${v.nodes.length} node(s) — ${v.nodes[0].html.slice(0, 90)}`);
      }
      // Server-rendered shell: a page whose content only exists after hydration
      // is invisible to crawlers and blank on a slow connection.
      const shell = await page.evaluate(() => ({
        mains: document.querySelectorAll("main").length,
        h1s: document.querySelectorAll("h1").length,
      }));
      if (shell.mains !== 1) fail(route, "landmark", `expected exactly one <main>, found ${shell.mains}`);
      if (shell.h1s !== 1) fail(route, "heading", `expected exactly one <h1>, found ${shell.h1s}`);
      process.stdout.write(".");
    }
    await ctx.close();
  }

  // ---- Horizontal overflow, at every width ---------------------------
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30_000);
    await isolate(page);
    for (const route of ROUTES) {
      await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(250);
      const { scrollWidth, clientWidth, offenders } = await page.evaluate(() => {
        const de = document.documentElement;
        const out = [];
        if (de.scrollWidth > de.clientWidth + 1) {
          for (const el of document.querySelectorAll("body *")) {
            const b = el.getBoundingClientRect();
            if (b.width > 0 && b.right > de.clientWidth + 2) {
              out.push(`${el.tagName}.${String(el.className).slice(0, 40)} → right ${Math.round(b.right)}`);
            }
          }
        }
        return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, offenders: out.slice(0, 3) };
      });
      if (scrollWidth > clientWidth + 1) {
        fail(route, `overflow @${width}px`, `document is ${scrollWidth}px wide — ${offenders.join(" | ") || "no single offender found"}`);
      }
      process.stdout.write(".");
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

const renders = ROUTES.length * (WIDTHS.length + 1);
console.log(`\n\n${ROUTES.length} routes · ${renders} renders · widths ${WIDTHS.join(", ")}`);

if (!failures.length) {
  console.log("PASS — no accessibility or layout regressions.\n");
  process.exit(0);
}

console.error(`\nFAIL — ${failures.length} problem(s):\n`);
for (const f of failures) console.error(`  ${f.route}  [${f.kind}]  ${f.detail}`);
console.error(
  "\nThese run against a production build. To reproduce locally:\n" +
    "  npm run build && npm start &\n  npm run check:ui\n"
);
process.exit(1);
