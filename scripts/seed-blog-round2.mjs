// Round-2 blog content — high-commercial-intent gaps from the keyword brief:
// competitor "alternative" pages + more sector-lead pages. Same publishing path
// as scripts/seed-blog.mjs (Supabase REST upsert on slug), and it validates
// every internal /blog/ link against the LIVE published set (fetched from the
// DB) plus the round-2 slugs — so cross-links to the existing 20 are checked.
//
// Honesty rule for the "alternative" pages: describe the competitor fairly,
// state plainly where they are stronger, and never claim a capability
// CompaniesIQ doesn't have (it is not a credit bureau; it does not resell deep
// financials). Comparative, not disparaging.
//
// Usage:  node scripts/seed-blog-round2.mjs            # publish/refresh
//         node scripts/seed-blog-round2.mjs --draft    # insert as drafts
import { readFileSync } from "node:fs";

function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const file = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const line = file.split("\n").find((l) => l.startsWith(name + "="));
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    /* no .env.local */
  }
  return null;
}

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const DRAFT = process.argv.slice(2).includes("--draft");
const AUTHOR = "CompaniesIQ Research";
const REST = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/posts`;
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
};

const ARTICLES = [
  {
    slug: "best-uk-company-database",
    title: "The Best UK Company Database in 2026: A Buyer's Guide",
    excerpt:
      "There's no single best UK company database — the right one depends on your job. Here's how the main categories compare and how to choose without overpaying.",
    meta_description:
      "How to choose the best UK company database in 2026: official register vs financials, high-growth and intelligence tools — what to evaluate and what to pay.",
    body_md: `The best UK company database is the one that fits your job — there is no single winner, because "company data" covers everything from a one-off ownership check to building a live sales pipeline. Every option is built on the same free foundation, the Companies House register, and then specialises. This guide breaks the market into its real categories, shows what to evaluate, and helps you avoid paying enterprise prices for a job a cheaper tool does better.

## Everything starts with Companies House

The [Companies House register](https://find-and-update.company-information.service.gov.uk/) is the official, free source: over five million companies with names, directors, people with significant control, SIC codes and full filing history. It is authoritative but built for looking up one company at a time — no bulk filtering, no export, no analysis. Every commercial database layers value on top of it, so the real question is *which layer you need*. Our [UK company database explainer](/blog/uk-company-database) covers the foundation in depth.

## The four categories

Most tools fall into one of four buckets:

1. **Official register** — Companies House itself. Free, authoritative, single-company lookups. Best when you just need the facts on one company.
2. **Financials & credit** — tools that turn filed accounts into comparable figures and risk scores. Best for credit decisions and supplier vetting.
3. **High-growth & funding** — curated data on venture-backed and scaling companies. Best for investors and those selling to funded startups.
4. **Company intelligence & leads** — live company data plus new-formation feeds, signals and filtering for prospecting and research. This is where CompaniesIQ sits.

Matching the category to your job is 80% of the decision. A credit tool is wasted on a sales team; an intelligence platform is the wrong tool for a formal credit score.

## What to evaluate

Within a category, five things separate a good database from an expensive one:

- **Live or a snapshot?** Stale data quietly costs you — dissolved companies, resigned directors, old addresses. Ask whether it queries the source live. CompaniesIQ is live-only against the Companies House API.
- **Sourcing transparency.** A trustworthy provider tells you what is official, what is modelled and what is third-party. CompaniesIQ publishes this on its [sources](/sources) page.
- **Filtering & export.** Can you slice by SIC code, region and recency the way you actually work? See [SIC codes explained](/blog/sic-codes-explained).
- **Recency & signals.** For prospecting, new incorporations and [director/ownership changes](/blog/company-monitoring-alerts-uk) matter more than a huge static count.
- **Price at your volume.** Per-report pricing is cheap for occasional checks and ruinous for list-building; a flat subscription is the opposite. Compare on [pricing](/pricing).

## Which alternative for which job

- Want the authoritative facts on one company? Use Companies House, or a faster interface over it — see [Companies House search alternatives](/blog/companies-house-search-alternatives).
- Vetting a customer's finances or credit? A financials-first tool like a [Company Check alternative](/blog/company-check-alternative) comparison will help you weigh options.
- Sourcing funded startups? Read [finding high-growth and funded companies](/blog/high-growth-companies-uk) and the [Beauhurst alternative](/blog/beauhurst-alternative) comparison.
- Building a sales pipeline from new and changing companies? That is the [sales intelligence](/blog/sales-intelligence-platform) job — start with [new business leads from Companies House](/blog/new-business-leads-companies-house).

## The honest bottom line

Most serious users combine two tools: Companies House as the source of truth, plus one specialist for the job it can't do — financials, funding, or a live intelligence and leads layer. Decide the job first, evaluate on live-vs-snapshot and sourcing, and only then compare price. If your job is finding and tracking new and growing UK companies, you can [search the live register now](/search) or get a [free weekly email of new companies](/free-alerts) in your sector.`,
    faq: [
      { q: "What is the best UK company database?", a: "There isn't one winner — it depends on the job. Companies House is best for authoritative single lookups; financials tools for credit; specialist tools for high-growth/funding; and intelligence platforms for live data, new-formation feeds and prospecting. Match the category to your task first." },
      { q: "Is there a free UK company database?", a: "Yes — the Companies House register is free and authoritative, covering over five million companies. It's excellent for single lookups but limited for bulk filtering, export and analysis, which is where paid tools add value." },
      { q: "What should I evaluate before buying?", a: "Whether the data is live or a stale snapshot, how transparent the sourcing is, whether you can filter and export the way you work, how good the recency/signals are, and the price at your actual volume." },
      { q: "How much should a UK company database cost?", a: "From free (the register and its API) to per-report pricing to flat monthly subscriptions. Subscriptions suit regular list-building; per-report pricing suits occasional one-off checks. Match the pricing model to how often you'll use it." },
    ],
    related: [
      { label: "The UK company database explained", href: "/blog/uk-company-database" },
      { label: "Companies House search alternatives", href: "/blog/companies-house-search-alternatives" },
      { label: "Free weekly new-company alerts", href: "/free-alerts" },
      { label: "Sales intelligence platform guide", href: "/blog/sales-intelligence-platform" },
      { label: "Pricing", href: "/pricing" },
    ],
  },

  {
    slug: "endole-alternative",
    title: "Endole Alternative: Live, Source-Transparent UK Company Data",
    excerpt:
      "Endole is a popular way to look up UK company data. If you want live register data, new-formation tracking and transparent sourcing, here's how CompaniesIQ compares.",
    meta_description:
      "An Endole alternative with live Companies House data, new-company tracking and transparent sourcing — for UK company research and lead generation.",
    body_md: `Endole is a well-known UK platform for looking up company profiles, directors and financial summaries, built on Companies House data with extra context layered on. If you've searched for an Endole alternative, it's usually for one of a few reasons: you want data that is live rather than a stored snapshot, you're focused on *new* companies for prospecting, or you want a clear view of where each figure comes from. Here's an honest comparison.

## What Endole does well

Endole presents Companies House data in a fast, readable form — company overviews, officer lists, filing history and financial summaries derived from filed accounts, plus some competitor and trademark context. For a quick profile of an established company, it's a capable tool, and much of its underlying data is the same public register everyone builds on.

## Why look for an alternative

Common reasons people compare:

- **They want live data, not a snapshot.** Any database that stores a periodic copy of the register drifts out of date between refreshes — dissolved companies, resigned directors, changed addresses.
- **They're prospecting new companies.** Looking up an established firm is one job; getting a filtered feed of businesses that *just formed* is a different one.
- **They want to know the source of each figure.** Modelled or third-party numbers should be labelled as such.

## How CompaniesIQ is different

[CompaniesIQ](/search) is a company-intelligence platform with a deliberate stance:

- **Live-only.** It queries the Companies House API directly rather than reselling a stored snapshot, so directors, addresses and statuses reflect the current record.
- **Built around new formations.** Its core is finding [newly registered companies](/blog/newly-registered-companies-uk) and [companies formed today](/blog/companies-formed-today-uk), filtered by [sector](/industry/technology) and [region](/market/london) — the freshest commercial intent there is.
- **Transparent sourcing.** Every figure is labelled live-vs-reference on the [sources](/sources) page, and regional economic context comes from the free Nomis/ONS service.
- **Signal-led.** Director appointments, PSC changes and charges are surfaced as they happen — see [company monitoring and alerts](/blog/company-monitoring-alerts-uk).

## Where Endole may still suit you better

Being honest about fit: if your primary need is **detailed financial summaries or credit-style context on established companies**, a financials-oriented view may serve you better than a live intelligence layer. CompaniesIQ is not a credit bureau and doesn't market deep credit scores; it's built for finding, researching and tracking companies — especially new and changing ones — from the live register. For a credit-first comparison, see our [Company Check alternative](/blog/company-check-alternative) piece.

## Try the alternative

If your job is prospecting, research or monitoring rather than formal credit checks, the live, new-formation angle is the difference that matters. [Search the live register](/search), or get a [free weekly email of new companies](/free-alerts) in your sector and region — no account required. For the wider market, our [best UK company database guide](/blog/best-uk-company-database) compares every category.`,
    faq: [
      { q: "What is a good alternative to Endole?", a: "For live register data, new-company tracking and transparent sourcing, CompaniesIQ is a strong alternative. It queries Companies House live rather than reselling a snapshot and focuses on new and changing companies for prospecting and research." },
      { q: "Is Endole data live?", a: "Like many databases, tools that store a periodic copy of the register can drift between refreshes. If live accuracy matters — current directors, addresses and statuses — choose a provider that queries Companies House directly, such as CompaniesIQ." },
      { q: "Does CompaniesIQ do the same job as Endole?", a: "It overlaps on company data but differs in emphasis: CompaniesIQ is live-only and built around new-formation feeds, signals and filtering for prospecting. It is not a credit bureau, so for deep financial or credit summaries a financials-first tool may fit better." },
      { q: "Is CompaniesIQ free?", a: "You can search the live register and get a free weekly new-company email without a card. Paid plans add unlimited reports, filtering, exports and alerts — see the pricing page." },
    ],
    related: [
      { label: "Company Check alternative", href: "/blog/company-check-alternative" },
      { label: "The best UK company database", href: "/blog/best-uk-company-database" },
      { label: "Companies House search alternatives", href: "/blog/companies-house-search-alternatives" },
      { label: "Free weekly new-company alerts", href: "/free-alerts" },
      { label: "Search the live register", href: "/search" },
    ],
  },

  {
    slug: "company-check-alternative",
    title: "Company Check Alternative: Live Company Intelligence, Not Just Credit",
    excerpt:
      "Company Check is known for financials and credit context. If your job is finding, researching and tracking UK companies — especially new ones — here's how CompaniesIQ compares.",
    meta_description:
      "Looking for a Company Check alternative? Compare live Companies House data, new-formation tracking and prospecting signals with a credit-focused tool.",
    body_md: `Company Check is a UK company data site known for surfacing financials and credit-style context — net worth, liabilities and ratings drawn from filed accounts. If you've searched for a Company Check alternative, the honest first question is *what job you're doing*, because the answer changes the recommendation. For formal credit decisions, you want a credit-focused tool. For finding, researching and tracking companies — especially new ones — a live intelligence platform is a better fit.

## What Company Check is good at

Company Check turns Companies House filings into quick financial snapshots and credit-style indicators, which is genuinely useful when you're deciding whether to extend terms to a customer or vet a supplier. If a credit or financial-health check is your main need, a financials-first tool is the right category — and we'd say so plainly.

## When you actually want something different

Many people reaching for a "company database" don't need a credit score at all — they need to:

- **Find new companies to sell to.** A filtered feed of [newly registered companies](/blog/newly-registered-companies-uk) beats a static financial profile for prospecting.
- **Research a company's people and structure.** Who runs it, [who owns it](/blog/who-owns-a-company-uk), and what it has [filed](/blog/company-filings-history-explained).
- **Track companies for change.** Director, ownership and filing events as they happen — see [company monitoring and alerts](/blog/company-monitoring-alerts-uk).

## How CompaniesIQ compares

[CompaniesIQ](/search) is built for those jobs:

- **Live-only** against the Companies House API — no stale snapshot.
- **New-formation focus** — find [companies formed today](/blog/companies-formed-today-uk), filtered by [sector](/industry/construction) and [region](/market/scotland).
- **Signals and filtering** for [sales intelligence](/blog/sales-intelligence-platform) and lead generation, with regional context from Nomis/ONS.
- **Transparent sourcing** on the [sources](/sources) page.

## The honest distinction

The clearest way to choose: **if you need a formal credit or financial-health verdict on an established company, use a credit-focused tool** — CompaniesIQ is not a credit bureau and won't give you a credit score. **If you need to find, qualify and track companies — especially new and changing ones — for sales, research or monitoring**, that's where a live intelligence platform wins. Plenty of teams use both: a credit tool for risk, an intelligence layer for growth.

## Try it for the growth side

If prospecting and research are your real need, [search the live register](/search) or get a [free weekly email of new companies](/free-alerts) in your sector. For the full landscape, see the [best UK company database guide](/blog/best-uk-company-database) and the [Endole alternative](/blog/endole-alternative) comparison.`,
    faq: [
      { q: "What is a good alternative to Company Check?", a: "It depends on the job. For credit and financial-health checks, use a credit-focused tool. For finding, researching and tracking companies — especially new ones — a live intelligence platform like CompaniesIQ is a better fit." },
      { q: "Does CompaniesIQ provide credit scores?", a: "No. CompaniesIQ is not a credit bureau and doesn't provide credit scores. It's a live company-intelligence and lead-generation platform. For formal credit decisions, use a dedicated credit-checking service." },
      { q: "What does CompaniesIQ do that a credit tool doesn't?", a: "Live new-formation feeds, sector/region filtering, prospecting signals (director, ownership and filing changes) and transparent sourcing — built for finding and tracking companies rather than scoring their credit." },
      { q: "Can I use both?", a: "Yes, and many teams do: a credit tool for risk and supplier vetting, and an intelligence layer like CompaniesIQ for prospecting and monitoring new and growing companies." },
    ],
    related: [
      { label: "Endole alternative", href: "/blog/endole-alternative" },
      { label: "The best UK company database", href: "/blog/best-uk-company-database" },
      { label: "Sales intelligence platform guide", href: "/blog/sales-intelligence-platform" },
      { label: "Free weekly new-company alerts", href: "/free-alerts" },
      { label: "Search the live register", href: "/search" },
    ],
  },

  {
    slug: "beauhurst-alternative",
    title: "Beauhurst Alternative: Track New & Growing UK Companies from the Register",
    excerpt:
      "Beauhurst specialises in curated high-growth and funding data. For a live, register-based way to spot new and growing UK companies, here's how CompaniesIQ compares.",
    meta_description:
      "Looking for a Beauhurst alternative? Compare live Companies House signals for new and growing UK companies with curated high-growth and funding data.",
    body_md: `Beauhurst is a respected UK platform specialising in high-growth, ambitious and venture-backed companies, with curated funding rounds, deal data and growth signals. If you've searched for a Beauhurst alternative, it's often because you want something **live, broader and less expensive** — a way to spot new and growing companies from the public register as they emerge, rather than a curated deals database. Here's an honest comparison.

## What Beauhurst does well

Beauhurst's strength is **curated, researched data on funded and high-growth companies** — investment rounds, investors, and growth-stage signals that aren't fully visible on the public register. For venture and PE research, corporate finance, or anyone whose job is deal flow, that curation is valuable and hard to replicate.

## Where a register-based alternative fits

Not everyone needs curated deal data. Many people want to:

- **Catch companies early** — the moment they [incorporate](/blog/newly-registered-companies-uk), before they show up in any curated list.
- **Read growth signals from public data** — [PSC (ownership) changes](/blog/who-owns-a-company-uk) that often mark investment, [charges](/blog/company-filings-history-explained) that signal secured borrowing, and experienced new directors. See [finding high-growth and funded companies](/blog/high-growth-companies-uk).
- **Cover the whole register, cheaply** — every new company, not just the venture-backed subset.

## How CompaniesIQ compares

[CompaniesIQ](/search) is a live, register-based intelligence platform:

- **Live-only** against Companies House — current, not a curated periodic release.
- **New-formation and signal focus** — build a [startup view](/blog/startup-database-uk) by [sector](/signals/fintech) and [region](/market/london), and watch [ownership and filing changes](/blog/company-monitoring-alerts-uk).
- **Broad and affordable** — the whole register rather than a researched subset, with transparent [sourcing](/sources).

## The honest distinction

Be clear about the trade-off: **Beauhurst gives you curated, human-researched funding and deal data that the public register simply doesn't contain** — named investors, round sizes, valuations. CompaniesIQ does **not** provide curated funding rounds; it reads growth from *public* signals (new formations, PSC changes, charges). So if your job depends on detailed, sourced deal data, Beauhurst is the specialist. If you want a live, low-cost way to spot new and growing companies across the whole register and track them for change, that's the CompaniesIQ angle.

## Try the register-based approach

[Search the live register](/search) for new and growing companies, or get a [free weekly email](/free-alerts) of new companies in your sector. For the wider market, see the [best UK company database guide](/blog/best-uk-company-database).`,
    faq: [
      { q: "What is a good alternative to Beauhurst?", a: "For a live, register-based way to spot new and growing UK companies — using new formations, PSC changes and charges as signals — CompaniesIQ is a broad, affordable alternative. For curated funding-round and investor data, Beauhurst remains the specialist." },
      { q: "Does CompaniesIQ have funding round data?", a: "Not curated funding rounds. It reads growth from public register signals — new incorporations, people-with-significant-control changes (often investment) and charges (secured borrowing) — rather than named investors, round sizes or valuations." },
      { q: "Why choose a register-based tool over curated data?", a: "To catch companies the moment they form, cover the whole register rather than a researched subset, and keep costs down. Curated tools add human-researched deal data the register doesn't hold; register-based tools are broader, live and cheaper." },
      { q: "Can CompaniesIQ find high-growth companies?", a: "Yes — by combining signals (a young company in a high-growth sector with a recent PSC change, a new charge and an experienced director). It infers momentum from public data rather than curated funding records." },
    ],
    related: [
      { label: "Finding high-growth & funded companies", href: "/blog/high-growth-companies-uk" },
      { label: "Startup database UK", href: "/blog/startup-database-uk" },
      { label: "The best UK company database", href: "/blog/best-uk-company-database" },
      { label: "Free weekly new-company alerts", href: "/free-alerts" },
      { label: "Search the live register", href: "/search" },
    ],
  },

  {
    slug: "estate-agent-leads-uk",
    title: "Estate Agent & Property Company Leads: Finding New Firms in the UK",
    excerpt:
      "How to find newly formed estate agents, lettings and property companies across the UK from the public register, and reach them while they're setting up.",
    meta_description:
      "Find UK estate agent and property company leads from the public register: new lettings, sales and property firms by region, reached early and compliantly.",
    body_md: `New estate agencies, lettings businesses and property companies incorporate constantly, and every one is a fresh prospect for suppliers who serve the sector — portals, CRM and software vendors, compliance and referencing services, marketers, accountants and insurers. Because these firms register at Companies House, you can find them the week they form, filtered by area, and reach out while they're still choosing their tools and suppliers.

## Why new property firms are a strong pool

A brand-new estate agent or lettings business has an immediate shopping list: portal listings, a CRM, client accounting, referencing and compliance, branding and a website. It also has no incumbent suppliers. The register hands you the timing — you arrive during setup rather than trying to displace an established relationship. You can see the sector picture on the [real estate industry page](/industry/real-estate) and track the theme via [property signals](/signals/property).

## Find the right companies

The sector is broad, so filter to the part you serve:

- **By activity (SIC code).** Estate agency, letting and management, and property development each map to their own codes — see [SIC codes explained](/blog/sic-codes-explained) for how to target precisely.
- **By region or city.** Property is intensely local — new firms in [London](/market/london), [the South East](/market/south-east), or cities like [Manchester](/city/manchester) and [Birmingham](/city/birmingham).
- **By recency.** New formations are the warmest leads; reach them before they've chosen a portal or CRM.

Build this list on the [CompaniesIQ search](/search), or get them delivered with a [free weekly email](/free-alerts) of new property companies in your area.

## Qualify before you contact

The register lets you screen leads: check the directors (first-time agent or an experienced operator opening a new branch?), and whether the registered office looks like a real branch or a formation agent's address. New developers often register [charges](/blog/company-filings-history-explained) when a project is financed — a useful signal.

## Reach them well

- Address the named director and reference their firm and location.
- Lead with the specific value you offer a new agency — faster listings, simpler client accounting, compliance done right, or a professional web presence.
- Keep it short and follow up once or twice.

Many new property firms have no website yet — if you sell web or marketing services, see [how to find businesses without websites](/blog/find-businesses-without-websites).

## Stay compliant

This is B2B outreach under PECR and UK GDPR: keep it relevant, identify yourself, and offer an easy opt-out. Some small agencies trade as sole traders or partnerships, which have stronger protections than registered companies, so check the entity type. For the general method, see the [UK business leads playbook](/blog/uk-business-leads).`,
    faq: [
      { q: "How do I find new estate agents in the UK?", a: "Filter the Companies House register for recent incorporations using estate agency and lettings SIC codes, narrowed by region or city. A platform that ingests new formations lets you build and export this list, or receive it as a weekly email." },
      { q: "Why target newly formed property companies?", a: "They need portals, CRM, client accounting, compliance, branding and a website early, and have no incumbent suppliers — so relevance and timing are built in, unlike pitching an established agency." },
      { q: "How do I target a specific property niche?", a: "Use the relevant SIC codes — estate agency, letting and management, or property development — combined with region and recency to isolate exactly the firms and area you serve." },
      { q: "Is it compliant to contact new agencies?", a: "Yes, as B2B outreach under PECR and UK GDPR: keep it relevant, identify yourself and offer an opt-out. Check whether the firm is a registered company or a sole trader/partnership, which have stronger protections." },
    ],
    related: [
      { label: "Real estate industry data", href: "/industry/real-estate" },
      { label: "UK business leads playbook", href: "/blog/uk-business-leads" },
      { label: "Find businesses without websites", href: "/blog/find-businesses-without-websites" },
      { label: "Free weekly new-company alerts", href: "/free-alerts" },
      { label: "Search the register", href: "/search" },
    ],
  },

  {
    slug: "ecommerce-business-leads-uk",
    title: "Ecommerce Business Leads UK: Finding New Online Retailers",
    excerpt:
      "How to find newly formed ecommerce and online retail companies in the UK from the public register, and reach them while they're building their store and stack.",
    meta_description:
      "Find UK ecommerce business leads from the public register: new online retailers by sector and region, reached early — for agencies, apps and suppliers.",
    body_md: `New ecommerce and online retail companies form every day in the UK, and each one is about to make a run of supplier decisions — a store platform, payments, fulfilment and shipping, apps, marketing and a brand. For agencies, SaaS vendors, fulfilment and logistics providers and B2B suppliers, newly formed online retailers are a high-intent pool you can find on the public register and reach while those decisions are still open.

## Why new ecommerce firms convert

A new online retailer's to-do list is long and immediate, and it has no incumbent suppliers. That's the ideal moment to reach it — before it has picked a platform, an app stack or a marketing agency. The register tells you who these companies are and when they formed. Track the theme via [ecommerce signals](/signals/ecommerce) and the broader [retail & wholesale sector](/industry/retail-and-wholesale).

## Find the right companies

- **By activity and theme.** Online retail spans mail-order and internet retail SIC codes plus a lot of keyword signal — see [SIC codes explained](/blog/sic-codes-explained) for the structured side and [ecommerce signals](/signals/ecommerce) for the theme.
- **By region or city.** Even online businesses cluster — new firms in [London](/market/london), [Manchester](/city/manchester) or across [the North West](/market/north-west).
- **By recency.** New formations are the warmest; reach them before the stack is chosen.

Build the list on the [CompaniesIQ search](/search), or get a [free weekly email](/free-alerts) of new ecommerce companies in your area.

## Match the pitch to the decision

Different suppliers hit different moments:

- **Agencies and web/marketing** — many new stores have no site or SEO yet; see [find businesses without websites](/blog/find-businesses-without-websites) and [marketing agency leads](/blog/marketing-agency-leads-uk).
- **Apps, SaaS and payments** — reach founders while they're assembling the stack.
- **Fulfilment, packaging and logistics** — a new retailer needs to ship from day one.

## Qualify and reach out

Screen with the register — the directors and whether the setup looks real and active. Then address the named founder, reference the business, and lead with the one thing you make easier (faster launch, better conversion, cheaper shipping). Keep it short, follow up lightly.

## Compliance

Standard B2B rules under PECR and UK GDPR apply: relevance, clear identification and an easy opt-out; take extra care with sole traders. For the full method, see the [UK business leads playbook](/blog/uk-business-leads) and, for the general mechanics, [newly registered companies](/blog/newly-registered-companies-uk).`,
    faq: [
      { q: "How do I find new ecommerce companies in the UK?", a: "Filter the Companies House register for recent incorporations using online/mail-order retail SIC codes and ecommerce keyword signals, narrowed by region. A platform that ingests new formations lets you build or receive this list." },
      { q: "Why are new online retailers good leads?", a: "They make many supplier decisions fast — platform, payments, fulfilment, apps, marketing, branding — and have no incumbent suppliers, so a well-timed, relevant pitch lands far better than a cold list of established stores." },
      { q: "Which suppliers benefit most?", a: "Web and marketing agencies, SaaS and payments providers, and fulfilment/logistics and packaging suppliers — each reaching the founder at the moment they're choosing that part of the stack." },
      { q: "Is contacting new ecommerce firms compliant?", a: "Yes, as B2B outreach under PECR and UK GDPR: keep it relevant, identify yourself and offer an opt-out. Sole traders and some partnerships have stronger protections, so confirm the entity type." },
    ],
    related: [
      { label: "Ecommerce companies signal", href: "/signals/ecommerce" },
      { label: "Find businesses without websites", href: "/blog/find-businesses-without-websites" },
      { label: "Marketing agency leads UK", href: "/blog/marketing-agency-leads-uk" },
      { label: "Free weekly new-company alerts", href: "/free-alerts" },
      { label: "Search the register", href: "/search" },
    ],
  },
];

async function fetchPublishedSlugs() {
  const res = await fetch(`${REST}?select=slug&status=eq.published`, { headers });
  if (!res.ok) return new Set();
  const rows = await res.json();
  return new Set(rows.map((r) => r.slug));
}

async function main() {
  const status = DRAFT ? "draft" : "published";
  console.log(`Seeding ${ARTICLES.length} round-2 posts as ${status} → ${REST}`);

  // Validate every internal /blog/ link resolves to an already-published slug
  // OR one of the round-2 slugs we're about to publish.
  const existing = await fetchPublishedSlugs();
  const round2 = new Set(ARTICLES.map((a) => a.slug));
  const known = new Set([...existing, ...round2]);
  let warnings = 0;
  for (const a of ARTICLES) {
    const bodyRefs = [...a.body_md.matchAll(/\]\(\/blog\/([a-z0-9-]+)\)/g)].map((m) => m[1]);
    const relRefs = (a.related || []).map((r) => r.href).filter((h) => h.startsWith("/blog/")).map((h) => h.slice(6));
    for (const ref of [...bodyRefs, ...relRefs]) {
      if (!known.has(ref)) {
        console.warn(`  ! ${a.slug}: links to unknown blog slug /blog/${ref}`);
        warnings++;
      }
    }
  }
  if (warnings) {
    console.error(`✗ ${warnings} unresolved internal blog link(s) — aborting.`);
    process.exit(1);
  }
  console.log("  ✓ All internal /blog/ links resolve.");

  const base = Date.now();
  const rows = ARTICLES.map((a, i) => ({
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    meta_description: a.meta_description,
    body_md: a.body_md,
    faq: a.faq,
    related: a.related,
    author: AUTHOR,
    status,
    published_at: DRAFT ? null : new Date(base - i * 60000).toISOString(),
    updated_at: new Date(base).toISOString(),
  }));

  const res = await fetch(`${REST}?on_conflict=slug`, { method: "POST", headers, body: JSON.stringify(rows) });
  if (!res.ok) {
    console.error(`✗ Upsert failed ${res.status}: ${(await res.text()).slice(0, 500)}`);
    process.exit(1);
  }
  console.log(`✓ Upserted ${rows.length} round-2 posts (${status}).`);
}

main().catch((e) => {
  console.error("✗", e);
  process.exit(1);
});
