// Seed the CompaniesIQ blog with the inaugural set of E-E-A-T articles.
//
// Writes 20 published posts into public.posts via Supabase REST (PostgREST),
// upserting on `slug` so the script is safe to re-run. Every article is
// answer-first (AEO), structured with H2/H3 + bullets (AIO/LLM), carries an
// FAQ block (FAQPage schema) and only links to internal pages that resolve
// (/industry/<sector>, /market/<region>, /city/<city>, /signals/<theme>,
// /search, /pricing, /sources, /blog). Figures are attributed to Companies
// House / ONS / Nomis or kept deliberately general — no fabricated statistics.
//
// Usage:  node scripts/seed-blog.mjs            # publish/refresh all 20
//         node scripts/seed-blog.mjs --draft    # insert as drafts instead
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the
// environment or .env.local. No SDK — runs on any Node.
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

// Articles in priority order (index 0 = highest value / most recent).
const ARTICLES = [
  {
    slug: "newly-registered-companies-uk",
    title: "Newly Registered Companies UK: How to Find Them (and Why Timing Wins)",
    excerpt:
      "A practical guide to finding newly registered UK companies on the public register, the data each one carries, and why the first few weeks after incorporation matter most.",
    meta_description:
      "Find newly registered UK companies on the public register, learn what data each carries, and why timing the first weeks after incorporation wins work.",
    body_md: `Newly registered companies in the UK are limited companies that have just been incorporated and added to the public register held by Companies House. Every one of them becomes searchable within days of formation, complete with company name, company number, incorporation date, registered office address, SIC (industry) codes and the names of the directors. That public record is the single best signal of fresh commercial intent in the country — a business that did not exist last week and is about to make its first decisions about banking, accounting, software and suppliers.

## Where the data comes from

Companies House is the official registrar of companies in England and Wales, Scotland and Northern Ireland. When someone forms a limited company, its core details are published on the register and made available free of charge. Hundreds of thousands of companies are incorporated in the UK each year, so the flow of new entities is constant rather than seasonal.

The free [Companies House register](https://find-and-update.company-information.service.gov.uk/) is excellent for looking up a single company you already know. What it does not do well is the opposite job — handing you a filtered, exportable list of every company formed in the last seven days in a given sector or region. That is the gap most teams need to close.

## What a new registration tells you

A single new incorporation carries more than a name. From the public record you can usually read:

- **Company name and number** — the permanent identifier you can track over time.
- **Incorporation date** — the clock that tells you exactly how fresh the lead is.
- **Registered office address** — useful for geographic targeting, though some are accountants' or formation agents' addresses rather than the real trading site.
- **SIC codes** — the Standard Industrial Classification codes that describe what the company says it does. These are how you target by industry. See our guide to [SIC codes](/blog/sic-codes-explained) for how to read them.
- **Directors and people with significant control** — who runs and who owns the company. Under the Economic Crime and Corporate Transparency Act, directors and PSCs now have to verify their identity with Companies House, which improves the quality of this data over time.

## Why timing is everything

The value of a new registration decays quickly. In the first one to four weeks after incorporation, a director is choosing an accountant, opening a business bank account, registering for VAT or PAYE if needed, and building a website. After a few months most of those decisions are made and a competitor has already won the relationship.

This is why a new-company feed beats a generic prospect list. You are not interrupting a settled business; you are arriving exactly when a decision is open. Accountants, banks, insurers, software vendors and agencies all compete in that same narrow window — the guide on [accounting leads from new companies](/blog/accounting-leads-new-companies) goes deeper on the professional-services angle.

## How to build a usable feed

There are three broad routes:

1. **Manual lookups on Companies House** — free, but no date or sector filtering and no export, so impractical at volume.
2. **The Companies House API** — free and powerful, but you have to build and maintain the tooling, and the search endpoints are not designed to return "everything formed yesterday."
3. **An intelligence layer on top of the register** — a platform that ingests new incorporations continuously and lets you filter by sector, region and recency, then export. That is the job [CompaniesIQ](/search) does.

## Targeting by sector and place

The fastest way to make a new-company feed productive is to narrow it. A few examples drawn from live register data:

- Agencies often watch high-formation consumer sectors such as [hospitality](/signals/hospitality), [beauty](/signals/beauty) and [ecommerce](/signals/ecommerce).
- B2B sellers track [technology](/industry/technology), [professional services](/industry/professional-services) and [construction](/industry/construction).
- Local firms filter by place — for example new companies in [Manchester](/city/manchester), [Birmingham](/city/birmingham) or across [the North West](/market/north-west).

Combining a sector signal with a region gives you a short, relevant list rather than thousands of rows you will never work through.

## A note on contact data and compliance

The register gives you company and officer details, not marketing consent. If you plan to contact new companies, treat directors' details as business data and follow PECR and UK GDPR — keep B2B outreach relevant, identify yourself clearly and honour opt-outs. The cleanest approach is to use the register to decide *who* to contact and *when*, then reach them through legitimate channels.

You can see exactly which figures on CompaniesIQ are live from Companies House versus published reference data on our [sources](/sources) page.`,
    faq: [
      { q: "Are newly registered companies public in the UK?", a: "Yes. When a limited company is incorporated, Companies House publishes its core details — name, number, incorporation date, registered office, SIC codes, directors and people with significant control — on the public register, free to access." },
      { q: "How quickly do new companies appear on the register?", a: "Usually within a day or two of incorporation. Online formations are often registered within 24 working hours, so a new company can be visible the next working day." },
      { q: "When is the best time to contact a newly formed company?", a: "Roughly one to four weeks after incorporation. By then the initial setup rush has settled and the director is making decisions about accounting, banking, VAT and suppliers, but has often not yet committed to providers." },
      { q: "Can I download a list of newly registered companies?", a: "Not directly from the free Companies House website, which has no date filter or bulk export. You need the Companies House API or an intelligence platform that ingests new incorporations and lets you filter and export them." },
    ],
    related: [
      { label: "New business leads from Companies House", href: "/blog/new-business-leads-companies-house" },
      { label: "Companies formed today", href: "/blog/companies-formed-today-uk" },
      { label: "Search the live register", href: "/search" },
      { label: "Technology companies", href: "/industry/technology" },
      { label: "London market data", href: "/market/london" },
    ],
  },

  {
    slug: "new-business-leads-companies-house",
    title: "How to Find New Business Leads from Companies House (Free and at Scale)",
    excerpt:
      "Companies House is the richest free source of UK business leads — if you know how to turn the register into a filtered, timely prospect list. Here is the method.",
    meta_description:
      "Turn the Companies House register into fresh UK business leads: free methods, the API, filtering by sector and region, and how to stay compliant.",
    body_md: `The most reliable source of new UK business leads is the Companies House register itself. Every limited company that forms publishes its name, number, incorporation date, registered office, industry (SIC) codes and directors — a public record of businesses making fresh decisions. The skill is not finding the data; it is filtering millions of records down to the few hundred that match your customer and reaching them while the opportunity is still open.

## Why the register beats a bought list

Generic B2B lists go stale the moment they are sold and are worked by everyone who buys them. The register, by contrast, refreshes every day with companies that did not exist before. A new incorporation is a defined, time-stamped event: a director has just set up a company and will soon need an accountant, a bank, insurance, software and suppliers. That is intent you can act on, not a guess.

## What you can pull for free

The public register is free and includes, for every company:

- Company name, number and status (active, dissolved, in liquidation)
- Date of incorporation
- Registered office address
- SIC codes describing the business activity
- Directors and people with significant control
- Full filing history — accounts, confirmation statements and charges

That is enough to qualify a lead before you ever make contact. The limitation is the interface: the free [Companies House search](https://find-and-update.company-information.service.gov.uk/) is built for looking up one company at a time, with no "show me everything formed last week in construction" filter and no export.

## Three ways to scale it

1. **Companies House API.** Free, well-documented, and the foundation almost every commercial tool is built on. Good if you have developers and time to maintain it. The search endpoints, however, are not designed to return new-formation feeds, so you will write logic to assemble and dedupe results.
2. **Commercial data lists.** Several providers sell weekly or monthly files of new companies, sometimes appended with phone or email. Fast, but you are buying the same list as your competitors and the contact append varies in quality.
3. **An intelligence platform.** A tool that continuously ingests the register and lets you filter by sector, region and recency, then export. This is what [CompaniesIQ](/search) is built to do, and it keeps the underlying data attributable to its source.

## Build a tight, relevant list

The mistake most teams make is going too broad. A list of "all new companies" is unworkable. Narrow on two or three axes:

- **Industry**, via SIC codes — for example [technology](/industry/technology), [construction](/industry/construction), [professional services](/industry/professional-services) or [real estate](/industry/real-estate).
- **Region or city** — companies forming in [London](/market/london), across [Scotland](/market/scotland), or specifically in [Leeds](/city/leeds) or [Bristol](/city/bristol).
- **Theme**, where a keyword matters more than a clean SIC code — for instance [fintech](/signals/fintech), [AI](/signals/ai) or [recruitment](/signals/recruitment).

Two filters usually take you from tens of thousands of rows to a few hundred you can genuinely work.

## Qualify before you contact

Because the register includes filing history and ownership, you can score a lead before reaching out:

- Is it genuinely new, or a long-dormant shell that just filed?
- Does the registered office look like a real trading address or a formation agent's?
- Who are the directors, and what else do they run? Serial founders behave differently from first-timers.

## Contact compliantly

The register tells you *who* and *when*; it does not grant marketing consent. For B2B outreach in the UK, follow PECR and UK GDPR: keep messages relevant to the recipient's business, identify yourself, and make opting out easy. Used this way — register for targeting, legitimate channels for contact — new-company data is both effective and defensible. See [pricing](/pricing) for how CompaniesIQ packages this, and [sources](/sources) for the provenance of every figure.`,
    faq: [
      { q: "Is it legal to use Companies House data for sales leads?", a: "Yes. The register is public and free to use, including for business development. Contacting companies is separate: B2B outreach must follow PECR and UK GDPR, so keep it relevant, identify yourself and honour opt-outs." },
      { q: "Does Companies House give you contact phone numbers or emails?", a: "No. The register provides company and officer details and a registered office address, but not marketing contact data. Phone and email appends come from third-party enrichment, with varying accuracy." },
      { q: "What is the cheapest way to get new business leads?", a: "The register itself is free. The cheapest scalable route is the free Companies House API if you can build tooling; otherwise an intelligence platform saves the engineering and adds filtering and export." },
      { q: "How do I avoid working the same leads as everyone else?", a: "Filter tightly by sector, region and recency, and act on new formations quickly. Niche, time-sensitive lists are far less contested than broad bought files." },
    ],
    related: [
      { label: "Newly registered companies UK", href: "/blog/newly-registered-companies-uk" },
      { label: "UK business leads playbook", href: "/blog/uk-business-leads" },
      { label: "SIC codes explained", href: "/blog/sic-codes-explained" },
      { label: "Search the register", href: "/search" },
      { label: "Construction sector data", href: "/industry/construction" },
    ],
  },

  {
    slug: "uk-company-database",
    title: "The UK Company Database, Explained: What's Public, What's Not, and How to Use It",
    excerpt:
      "What a UK company database actually contains, which parts come free from Companies House, what providers add on top, and how to choose the right one for your job.",
    meta_description:
      "The UK company database explained: what Companies House publishes free, what providers add, and how to choose the right source for research, leads or KYC.",
    body_md: `A UK company database is a structured, searchable record of the country's companies, built on the public register held by Companies House and usually enriched with extra data. At its core it tells you, for any company, who runs it, who owns it, where it is, what it does and what it has filed. The differences between databases come down to how much they add on top — financials, contact data, ownership mapping, signals — and how easily you can search and export.

## The free foundation: Companies House

Everything starts with [Companies House](https://find-and-update.company-information.service.gov.uk/), the official registrar. It holds well over five million companies and publishes, free of charge:

- Company name, number, status and incorporation date
- Registered office address and SIC (industry) codes
- Directors and people with significant control (PSCs)
- Full filing history — accounts, confirmation statements, charges and mortgages

This is authoritative data, straight from the source. Its limits are practical: the free interface searches one company at a time, offers little bulk filtering, and is not built for list-building or analysis.

## What providers add on top

Commercial databases layer extra value onto that foundation. Common additions include:

- **Structured financials** — turning filed accounts into comparable figures like turnover, net worth and cash, so you can screen by size or health.
- **Credit and risk scores** — for checking whether to extend terms to a customer or supplier.
- **Contact data** — phone numbers and emails appended from other sources (accuracy varies and is the most over-promised feature in the market).
- **Ownership and group mapping** — connecting parent companies, subsidiaries and shared directors.
- **Signals and recency** — new incorporations, director changes and filing events surfaced as they happen.

CompaniesIQ sits in this layer, but with a deliberate stance: it is **live-only**, drawing company data straight from the Companies House API and regional economic indicators from the free [Nomis/ONS](/sources) service, rather than reselling a stale snapshot.

## Match the database to the job

Different jobs need different databases:

- **Research and market sizing** — you want clean industry and regional breakdowns. Pages like [technology](/industry/technology), [financial services](/industry/financial-services) or [the West Midlands](/market/west-midlands) turn the register into a market picture.
- **Lead generation** — you want recency and tight filtering. See [new business leads from Companies House](/blog/new-business-leads-companies-house).
- **Due diligence and KYC** — you want ownership, PSCs and filing history. See [who owns a company in the UK](/blog/who-owns-a-company-uk).
- **Credit decisions** — you want financials and scores, ideally with the filed accounts behind them.

## Questions to ask before you choose

- **Is it live or a snapshot?** Stale data quietly costs you — dissolved companies, resigned directors, old addresses.
- **Where does each figure come from?** A trustworthy provider tells you what is from Companies House, what is modelled and what is third-party. CompaniesIQ publishes this on its [sources](/sources) page.
- **Can you filter and export the way you work?** By SIC code, region, recency, size.
- **What does it cost at your volume?** Per-search pricing and unlimited plans suit very different users — compare on [pricing](/pricing).

## The bottom line

The "best" UK company database depends entirely on the job. For authoritative core facts, nothing beats Companies House itself. For anything involving lists, filtering, recency or analysis, you want an intelligence layer on top — ideally one that stays close to the live source and is honest about where every number comes from. If you are weighing options, our piece on [Companies House search alternatives](/blog/companies-house-search-alternatives) compares the main routes.`,
    faq: [
      { q: "Is there a free UK company database?", a: "Yes — the Companies House register is free and authoritative, covering over five million companies. It is excellent for single lookups but limited for bulk filtering, export and analysis, which is where commercial databases add value." },
      { q: "What is the difference between Companies House and a commercial company database?", a: "Companies House is the official source of core company facts. Commercial databases build on it, adding structured financials, credit scores, contact data, ownership mapping and easier search, filtering and export." },
      { q: "How many companies are on the UK register?", a: "Companies House holds well over five million companies on the register, with hundreds of thousands incorporated each year and many dissolved, so the live total moves constantly." },
      { q: "Is company data live or a snapshot?", a: "It depends on the provider. Some resell periodic snapshots that go stale; others, including CompaniesIQ, query Companies House live so directors, addresses and statuses reflect the current record." },
    ],
    related: [
      { label: "Companies House search alternatives", href: "/blog/companies-house-search-alternatives" },
      { label: "Who owns a company in the UK", href: "/blog/who-owns-a-company-uk" },
      { label: "Data sources and provenance", href: "/sources" },
      { label: "Financial services sector", href: "/industry/financial-services" },
      { label: "Pricing", href: "/pricing" },
    ],
  },

  {
    slug: "uk-business-leads",
    title: "B2B Business Leads UK: A Practical Playbook for Building Fresh Lists",
    excerpt:
      "Where UK B2B leads actually come from, how to build a list that converts, and the difference between a bought file and a feed of companies making decisions right now.",
    meta_description:
      "A practical playbook for UK B2B business leads: sources that work, how to build a tight list from the register, and why fresh data beats bought files.",
    body_md: `Good UK business leads are not bought in bulk — they are built from public data and timed well. The strongest B2B lists in the UK start with the Companies House register, get narrowed to a specific industry and region, and prioritise companies that have just done something meaningful: incorporated, changed directors, or filed a charge. This playbook covers where leads come from, how to assemble a list that converts, and how to keep it compliant.

## Start with intent, not volume

A lead is only useful if the company is likely to need what you sell *now*. The register gives you intent signals you cannot get from a static list:

- **New incorporations** — businesses making their first supplier decisions. See [newly registered companies](/blog/newly-registered-companies-uk).
- **Director appointments** — new leadership often means new budgets and new vendors.
- **Charges and mortgages** — a company that has just borrowed is investing in something.
- **Confirmation statements and accounts** — filing activity confirms the company is live and trading.

Chasing volume gets you a big, cold, contested list. Chasing intent gets you a small, warm, timely one.

## Build the list in three filters

The fastest route to a workable list is to layer filters:

1. **Industry (SIC code).** Decide who you serve — for example [professional services](/industry/professional-services), [construction](/industry/construction), [retail and wholesale](/industry/retail-and-wholesale) or [transport and logistics](/industry/transport-and-logistics).
2. **Region or city.** Narrow to where you operate or sell — [London](/market/london), [the North West](/market/north-west), or a city like [Birmingham](/city/birmingham) or [Glasgow](/city/glasgow).
3. **Recency.** Restrict to companies that formed or changed in a recent window, so you reach them while a decision is open.

These three together usually cut hundreds of thousands of records down to a few hundred genuinely relevant ones. You can run exactly this on the [CompaniesIQ search](/search).

## Qualify before you spend effort

Because the register includes filing history and ownership, you can disqualify weak leads before contact:

- Skip long-dormant shells with no real activity.
- Be wary of registered offices that are clearly formation-agent addresses if you need the real trading location.
- Look at the directors — what else do they run, and does that fit your ideal customer?

## Contact data and the honest truth about it

The register gives you the company, the directors and a registered office. It does **not** give you verified marketing emails or direct dials. Those come from enrichment, and quality varies widely. Treat any appended contact data as a starting point to verify, not gospel — and budget for bounce and wrong-number rates.

## Stay on the right side of the rules

UK B2B outreach is governed by PECR and UK GDPR. In practice:

- Keep messages relevant to the recipient's role and business.
- Identify yourself and your company clearly.
- Make opting out simple and honour it immediately.
- Keep a note of why a company is a legitimate prospect.

Used this way, public register data is a strong, defensible foundation for outbound. If your buyers are accountants, agencies or specific sectors, the role-specific guides — [accounting leads](/blog/accounting-leads-new-companies), [marketing agency leads](/blog/marketing-agency-leads-uk) and [construction company leads](/blog/construction-company-leads-uk) — go deeper.`,
    faq: [
      { q: "What is the best source of B2B leads in the UK?", a: "The Companies House register, filtered tightly by industry, region and recency. It surfaces companies making real decisions now, which converts better than broad bought lists that everyone else also works." },
      { q: "Are bought business lists worth it?", a: "Sometimes, for reach. But they age fast, are worked by every buyer, and often have weak contact data. A fresh, filtered list built from the register usually outperforms them on relevance and response." },
      { q: "How do I make a lead list convert?", a: "Narrow on industry and region, prioritise companies with a recent trigger event, qualify out dormant shells, and reach out promptly with a message relevant to that specific business." },
      { q: "Do I need consent to email UK businesses?", a: "B2B email to corporate addresses is allowed under PECR with conditions: be relevant, identify yourself and offer a clear opt-out. Sole traders and some partnerships get stronger protection, so check the recipient type." },
    ],
    related: [
      { label: "New business leads from Companies House", href: "/blog/new-business-leads-companies-house" },
      { label: "What is a sales intelligence platform", href: "/blog/sales-intelligence-platform" },
      { label: "Accounting leads", href: "/blog/accounting-leads-new-companies" },
      { label: "Search the register", href: "/search" },
      { label: "Professional services data", href: "/industry/professional-services" },
    ],
  },

  {
    slug: "company-director-search-uk",
    title: "Company Director Search UK: How to Find Directors (and What the Record Shows)",
    excerpt:
      "How to find the directors of any UK company, what the public record reveals about each one, and how to use officer data for research, due diligence and prospecting.",
    meta_description:
      "Find directors of any UK company free on Companies House. What the officer record shows, how to search by person, and how to use director data responsibly.",
    body_md: `To find the directors of a UK company, search Companies House for the company and open its "People" tab, or search a person's name and use the "Officers" filter to see every appointment they hold. Both are free. The public record shows each director's name, role, appointment (and resignation) dates, partial date of birth, nationality, country of residence and now their identity-verification status. Here is how to do it well and what each field actually means.

## Two ways to search

There are two distinct director searches, and they answer different questions:

1. **Company to directors.** You know the company and want its board. Look it up on the [Companies House register](https://find-and-update.company-information.service.gov.uk/) and open the People section. You will see current and resigned officers, with appointment dates and roles.
2. **Director to companies.** You know a person and want everything they run. Search their name and select the Officers filter. Companies House returns all current and former appointments — invaluable for spotting serial directors, group structures and patterns across dissolved companies.

## What the officer record shows

For each director you can typically read:

- **Full name and any former names**
- **Role** — director, secretary, LLP member
- **Appointment date**, and resignation date if they have left
- **Date of birth** — month and year only, for privacy
- **Nationality and country of residence**
- **Correspondence (service) address** — often an office or agent, not a home
- **Identity verification status** — see below

## The identity-verification change

Under the Economic Crime and Corporate Transparency Act, Companies House has introduced **mandatory identity verification** for directors and people with significant control, which began rolling out from late 2025. Over time this means the people named on the register are verified rather than self-asserted — a real improvement in the reliability of director data for due diligence and KYC.

## What it is good for

Director data drives several jobs:

- **Due diligence.** Before you contract with or invest in a company, check who runs it and what else they are involved in. Cross-reference the [Director Disqualification Register](https://find-and-update.company-information.service.gov.uk/) to confirm no one is barred.
- **Ownership context.** Directors run a company; people with significant control own it. The two often overlap but not always — see [who owns a company in the UK](/blog/who-owns-a-company-uk).
- **Prospecting.** Knowing the decision-maker's name lets you address outreach correctly. Combine with sector and region filters on the [CompaniesIQ search](/search).
- **Monitoring.** Director appointments and resignations are strong signals — covered in [company monitoring and alerts](/blog/company-monitoring-alerts-uk).

## Use the data responsibly

Officer details are public for transparency, not for spam. A few principles:

- Treat correspondence addresses as business contact points, not invitations to contact someone at home.
- For outreach, follow PECR and UK GDPR — relevance, identification and easy opt-out.
- Remember the date of birth is deliberately partial; do not treat the register as an identity-theft resource.

Used properly, a director search is one of the most powerful free tools in UK business research — connecting people, companies and history in a way no single document can. To find directors within a specific market, start from a sector like [technology](/industry/technology) or a city like [Manchester](/city/manchester).`,
    faq: [
      { q: "How do I find the directors of a UK company for free?", a: "Search the company on Companies House and open the People tab. It lists current and resigned directors with their roles and appointment dates, free and without an account." },
      { q: "Can I search for every company a person is a director of?", a: "Yes. Search the person's name on Companies House and use the Officers filter. It returns all current and former appointments, including roles in dissolved companies." },
      { q: "What personal details of a director are public?", a: "Name, role, appointment and resignation dates, month and year of birth, nationality, country of residence and a correspondence address. Full dates of birth and home addresses are protected." },
      { q: "Do UK directors have to verify their identity now?", a: "Yes. Under the Economic Crime and Corporate Transparency Act, identity verification for directors and people with significant control became mandatory, rolling out from late 2025, improving the reliability of officer data." },
    ],
    related: [
      { label: "Who owns a company in the UK", href: "/blog/who-owns-a-company-uk" },
      { label: "Company monitoring and alerts", href: "/blog/company-monitoring-alerts-uk" },
      { label: "How to read filing history", href: "/blog/company-filings-history-explained" },
      { label: "Search the register", href: "/search" },
      { label: "Technology companies", href: "/industry/technology" },
    ],
  },

  {
    slug: "companies-house-search-alternatives",
    title: "Companies House Search Alternatives: When the Free Register Isn't Enough",
    excerpt:
      "The free Companies House register is authoritative but built for single lookups. Here are the alternatives — free and paid — and when each one is the right tool.",
    meta_description:
      "Companies House search alternatives compared — OpenCorporates, Endole, Company Check, Beauhurst and intelligence platforms — and when to use each.",
    body_md: `The free Companies House register is the authoritative source for UK company facts, but it is built for looking up one company you already know — not for filtering, list-building, financial analysis or monitoring. When you hit those limits, you need an alternative that sits on top of the same official data. This guide covers the main options, free and paid, and when each makes sense.

## What Companies House does — and doesn't — do

The [official register](https://find-and-update.company-information.service.gov.uk/) gives you, free: company details, directors, people with significant control, and full filing history including accounts and charges. It also offers an Advanced Search that filters by SIC code, location, status and incorporation date — a genuinely useful upgrade many people miss.

Where it falls short:

- No structured financials — you get the filed accounts as documents, not comparable figures.
- No bulk export of large, filtered lists.
- No credit scores, contact data or ownership mapping.
- No proactive monitoring beyond the free "Follow this company" email alerts.

If those gaps do not affect you, the free register may be all you need.

## Free alternatives

- **Companies House Advanced Search** — still the register, but with filtering. The right first step before paying for anything.
- **OpenCorporates** — the largest open database of companies, aggregating official registry data across many countries. Strong for cross-border and journalistic research; lighter on UK financials.

## Paid alternatives, by job

Different paid tools optimise for different jobs:

- **Endole** — presents Companies House data in a faster, more digestible form, with extras like competitor and trademark context.
- **Company Check** — focused on financials and credit, popular for quick checks on net worth, liabilities and ratings.
- **Beauhurst** — specialises in high-growth, ambitious and venture-backed companies, with funding and signal data. See our piece on [high-growth companies](/blog/high-growth-companies-uk).
- **Global, multi-jurisdiction providers** — for international ownership mapping and coverage beyond the UK.

## Where CompaniesIQ fits

[CompaniesIQ](/search) is an intelligence layer with a specific stance: it is **live-only**, querying the Companies House API directly rather than reselling a stale snapshot, and it pairs company data with regional economic indicators pulled live from the free Nomis/ONS service. The provenance of every figure — live versus published reference data — is set out on the [sources](/sources) page. It is built for the jobs the free register cannot do: filtering new formations by [sector](/industry/technology) and [region](/market/scotland), surfacing recent signals, and exporting tight, relevant lists.

## How to choose

Work backwards from the job:

- **One-off lookup of a known company?** Use Companies House. It is free and authoritative.
- **Cross-border or open-data research?** OpenCorporates.
- **Credit and financial screening?** A financials-first tool like Company Check.
- **High-growth and funding intelligence?** Beauhurst.
- **New-formation feeds, sector/region filtering and live data for leads or research?** An intelligence platform such as CompaniesIQ.

The honest answer is that most serious users combine two: Companies House as the source of truth, and one alternative for the filtering, financials or signals it lacks. Compare what you actually need against [pricing](/pricing) before committing.`,
    faq: [
      { q: "Is there a better alternative to Companies House search?", a: "It depends on the job. For authoritative single lookups, nothing beats Companies House itself. For filtering, financials, ownership mapping or monitoring, tools like OpenCorporates, Company Check, Beauhurst or an intelligence platform add what the free register lacks." },
      { q: "Is there a free alternative to Companies House?", a: "Companies House Advanced Search adds free SIC, location and status filtering, and OpenCorporates offers free multi-country search. Both build on or alongside official registry data." },
      { q: "Why use a paid tool when Companies House is free?", a: "Paid tools turn filed accounts into comparable financials, add credit scores, contact data and ownership maps, enable bulk filtering and export, and provide monitoring — none of which the free interface does well at scale." },
      { q: "What makes CompaniesIQ different?", a: "It is live-only, querying the Companies House API directly rather than reselling a snapshot, pairs company data with live Nomis/ONS regional indicators, and publishes the provenance of every figure on its sources page." },
    ],
    related: [
      { label: "The UK company database explained", href: "/blog/uk-company-database" },
      { label: "High-growth companies in the UK", href: "/blog/high-growth-companies-uk" },
      { label: "Data sources and provenance", href: "/sources" },
      { label: "Search the register", href: "/search" },
      { label: "Pricing", href: "/pricing" },
    ],
  },

  {
    slug: "startup-database-uk",
    title: "Startup Database UK: How to Track Newly Formed Companies",
    excerpt:
      "How to build a live view of UK startups from the public register — what counts as a startup, what data you can get, and how to track them by sector and stage.",
    meta_description:
      "Build a UK startup database from the public register: track newly formed companies by sector and region and spot early growth signals.",
    body_md: `A UK startup database is, at its foundation, a filtered, continuously updated view of newly formed companies drawn from Companies House. Every startup begins life as a fresh incorporation on the public register, carrying its name, formation date, industry (SIC) codes, registered office and founders. The work is turning that raw flow into a useful, categorised list — and then layering on the signals that tell you which young companies are actually growing.

## What counts as a startup here

"Startup" is a fuzzy word. For data purposes it usually means a company that is **recently incorporated** and **early-stage** — typically the last one to three years, often in a high-growth or technology-adjacent sector. The register cannot read intent, but it gives you the objective markers: incorporation date, SIC codes and, over time, filing and ownership activity.

## The raw material from Companies House

From the [public register](https://find-and-update.company-information.service.gov.uk/) you get, for each new company, free:

- Company name, number and incorporation date
- SIC codes describing the activity
- Registered office address
- Directors and people with significant control (the founders, usually)
- Filing history as it accumulates

This is the spine of any startup database. What it does not include is funding, headcount or revenue projections — those require enrichment or modelling.

## Filter to build your view

A raw feed of every new company is noise. Narrow it:

- **By sector or theme.** The most startup-dense areas of the register include [AI](/signals/ai), [fintech](/signals/fintech), [SaaS](/signals/saas), [cleantech](/signals/cleantech) and [ecommerce](/signals/ecommerce). Broader sector pages like [technology](/industry/technology) give the market picture.
- **By region or city.** Startup activity clusters — [London](/market/london), and cities such as [Manchester](/city/manchester), [Edinburgh](/city/edinburgh), [Bristol](/city/bristol) and [Cambridge](/city/cambridge).
- **By recency.** Restrict to a recent formation window to keep the view "young".

Run those filters live on the [CompaniesIQ search](/search) to get a current cohort rather than a stale export.

## Reading early growth signals

Not every new company is going somewhere. The register hints at momentum through:

- **Director appointments** — bringing in experienced operators or a board.
- **People with significant control changes** — often the footprint of investment, as new shareholders cross the 25% threshold.
- **Charges** — secured borrowing, a sign of capital being deployed.
- **Confirmation statements and accounts** — confirming the company is live and trading.

For funding and high-growth specifically, see [finding high-growth and funded companies](/blog/high-growth-companies-uk).

## Where the register stops

Be clear about the limits. Companies House will not tell you a startup's valuation, who its investors are by name beyond PSCs, its revenue, or its headcount. Specialist providers model some of this; CompaniesIQ stays close to the live official record and is explicit on its [sources](/sources) page about what is live versus reference data. For uses like sourcing deals, recruiting or selling into young companies, the combination of fresh formation data plus register-based signals is a strong, honest foundation.`,
    faq: [
      { q: "How do I find UK startups?", a: "Filter the Companies House register for recently incorporated companies in high-growth sectors and regions. Tools that ingest new formations let you build a live startup view by sector, theme and city." },
      { q: "What data is available on a UK startup?", a: "From the public register: name, incorporation date, SIC codes, registered office, directors and people with significant control, plus filing history. Funding, headcount and revenue are not on the register and require enrichment." },
      { q: "Can I see who funded a startup on Companies House?", a: "Partly. New investors who take more than 25% of shares or voting rights appear as people with significant control, and secured lending shows as charges. Detailed round and investor data is not on the register." },
      { q: "Which sectors have the most UK startups?", a: "Technology-adjacent themes dominate new high-growth formations — AI, fintech, SaaS, cleantech and ecommerce — though high-volume formation also occurs in consumer sectors like hospitality and beauty." },
    ],
    related: [
      { label: "Newly incorporated companies UK", href: "/blog/newly-incorporated-companies-uk" },
      { label: "High-growth companies in the UK", href: "/blog/high-growth-companies-uk" },
      { label: "AI companies signal", href: "/signals/ai" },
      { label: "Fintech companies signal", href: "/signals/fintech" },
      { label: "Search the register", href: "/search" },
    ],
  },

  {
    slug: "newly-incorporated-companies-uk",
    title: "Newly Incorporated Companies UK: A Guide for Accountants and Advisers",
    excerpt:
      "Newly incorporated companies are a defined, public pool of businesses about to make their first professional decisions. Here is how advisers can find and reach them.",
    meta_description:
      "How accountants and advisers find newly incorporated UK companies, what the register shows, the best outreach window, and how to do it well.",
    body_md: `Newly incorporated companies are limited companies that have just been registered at Companies House — a defined, publicly visible pool of businesses that did not exist the week before. For accountants, bookkeepers, tax advisers and other professional-services firms, this is one of the clearest sources of qualified opportunity in the country, because a brand-new director is about to make first decisions about accounting software, VAT, payroll and their first statutory filings, often without an adviser yet in place.

## Why this pool is so valuable

Most prospecting fights for the attention of businesses that already have suppliers. New incorporations are different: the relationships are genuinely unclaimed. Within weeks of forming, a director faces:

- Choosing accounting software and a bookkeeping approach
- Deciding whether and when to register for VAT
- Setting up PAYE if they will employ people
- Understanding Corporation Tax and confirmation-statement obligations
- Their first year-end and the deadlines that follow

An adviser who arrives during that window is offering help exactly when it is needed, not interrupting a settled arrangement.

## What the register tells you

When a company incorporates, the [public register](https://find-and-update.company-information.service.gov.uk/) publishes, within days and free:

- Company name, number and incorporation date
- SIC codes describing the intended activity
- Registered office address
- Director names and people with significant control

That is enough to qualify and personalise an approach. Note that the registered office is sometimes a formation agent's address rather than the trading location, which is worth checking.

## Timing the approach

The evidence points to a window of roughly **one to four weeks after incorporation**. Too early and the founder is still in the rush of setting up; too late and they have likely chosen an accountant. Aim for the point where the admin reality is starting to bite but no decision has been locked in.

## Build a targeted list

Cast narrowly, not widely:

- **By location**, to match where you practise — new companies in [Leeds](/city/leeds), [Birmingham](/city/birmingham), or across [the South West](/market/south-west).
- **By sector**, if you specialise — for example [construction](/industry/construction), [hospitality](/industry/hospitality) or [professional services](/industry/professional-services). Sector specialism is a genuine differentiator in accountancy.
- **By recency**, to stay inside the outreach window.

You can build exactly this list on the [CompaniesIQ search](/search), then export it to work through.

## Reach out compliantly

Professional-services outreach must respect PECR and UK GDPR. In practice:

- Address the director by name and reference their actual company and sector.
- Lead with genuine help — a first-year checklist, key deadlines — rather than a hard pitch.
- Identify your firm clearly and make opting out easy.
- Keep your targeting rationale on record.

Done well, new-incorporation outreach is one of the highest-converting channels available to an accountancy firm, precisely because the timing and relevance are built in. For the broader lead-generation context, see [accounting leads from new companies](/blog/accounting-leads-new-companies) and the general [UK business leads playbook](/blog/uk-business-leads).`,
    faq: [
      { q: "How can accountants find newly incorporated companies?", a: "Use the Companies House register, filtered for recent incorporations in your area or specialism. Platforms that ingest new formations let you filter by region, sector and recency and export the list." },
      { q: "When should an accountant contact a newly formed company?", a: "Roughly one to four weeks after incorporation. By then the founder is dealing with the admin reality — software, VAT, deadlines — but has often not yet appointed an accountant." },
      { q: "What information about a new company is public?", a: "Name, number, incorporation date, SIC codes, registered office and the directors and people with significant control — all free on the register within days of formation. Contact data is not included." },
      { q: "Is it compliant to contact new company directors?", a: "Yes, if you follow PECR and UK GDPR: keep outreach relevant, identify your firm, and offer a clear opt-out. Sole traders and some partnerships have stronger protections than registered companies." },
    ],
    related: [
      { label: "Accounting leads from new companies", href: "/blog/accounting-leads-new-companies" },
      { label: "Newly registered companies UK", href: "/blog/newly-registered-companies-uk" },
      { label: "Companies formed today", href: "/blog/companies-formed-today-uk" },
      { label: "Search the register", href: "/search" },
      { label: "Professional services data", href: "/industry/professional-services" },
    ],
  },

  {
    slug: "sales-intelligence-platform",
    title: "What Is a Sales Intelligence Platform? A Buyer's Guide for UK Teams",
    excerpt:
      "What a sales intelligence platform does, how it differs from a contact database, and what UK teams should look for — including data freshness and provenance.",
    meta_description:
      "A buyer's guide to sales intelligence platforms for UK teams: what they do, how they differ from contact databases, and what to check first.",
    body_md: `A sales intelligence platform gathers, structures and surfaces data about companies and the people who run them, so sales and marketing teams can find the right prospects, reach them at the right time, and have a relevant conversation. It goes beyond a static contact list by adding context — what a company does, how big it is, what has recently changed — and by turning that context into timing signals. For UK teams, the best of these are built on the Companies House register and enriched from there.

## What it actually does

A sales intelligence platform typically combines four things:

- **Company data** — firmographics: industry, size, location, structure, status.
- **People data** — decision-makers, their roles, and how to reach them.
- **Signals** — trigger events such as new incorporations, director changes, funding or hiring that indicate a buying window.
- **Search, scoring and export** — the ability to build a target list, prioritise it, and push it into your CRM or outreach tool.

## How it differs from a contact database

A contact database answers "who can I email?" A sales intelligence platform answers "which companies should I approach, why now, and who do I talk to?" The difference is context and timing. A list of 50,000 emails is a commodity; a feed of 200 companies that just incorporated in your sector, with the director named, is an opportunity.

## What UK teams should prioritise

The UK market has a specific advantage: an unusually rich, public company register. The platforms that exploit it well share certain traits.

### 1. Data freshness

Stale data quietly erodes results — dissolved companies, resigned directors, wrong addresses. Ask whether the platform queries source data **live** or resells a periodic snapshot. CompaniesIQ, for instance, is live-only against the Companies House API.

### 2. Provenance

A trustworthy platform tells you where each figure comes from — what is official, what is modelled, what is third-party. CompaniesIQ publishes this on its [sources](/sources) page; many providers do not disclose it at all.

### 3. The right filters

You want to slice by industry, region and recency the way you actually sell — for example new [technology](/industry/technology) companies in [London](/market/london), or [construction](/industry/construction) firms across [the North West](/market/north-west). Try this on the [CompaniesIQ search](/search).

### 4. Honest contact data

Phone and email enrichment is the most over-promised feature in the category. Treat appended contact data as something to verify, and judge a vendor by how candid they are about accuracy.

### 5. Workflow fit

Can you export, integrate with your CRM, and set up monitoring? Signals are only useful if they reach the rep in time — see [company monitoring and alerts](/blog/company-monitoring-alerts-uk).

## Who it is for

Sales intelligence pays off for anyone selling into UK businesses where timing matters: SaaS and B2B sales teams, accountants and advisers, agencies, insurers, brokers and recruiters. The common thread is that a recent change at the target company creates a window — and the platform's job is to put you in it.

## Before you buy

Map your use case to the data you need, then test on real searches. Check freshness, provenance, filters and export against your actual workflow, and weigh it against [pricing](/pricing) at your volume. The right platform is the one that surfaces the few hundred companies you should be talking to this week — not the one with the biggest headline database number.`,
    faq: [
      { q: "What is a sales intelligence platform?", a: "Software that collects and structures data about companies and decision-makers, adds context and timing signals, and helps sales teams find, prioritise and reach the right prospects at the right moment." },
      { q: "How is it different from a B2B contact database?", a: "A contact database tells you who to email. A sales intelligence platform adds firmographics, decision-makers and trigger events, so you know which companies to approach, why now, and who to speak to." },
      { q: "What should I look for in a UK sales intelligence tool?", a: "Live data rather than stale snapshots, clear provenance of every figure, filters that match how you sell (industry, region, recency), honest contact-data claims, and export or CRM integration." },
      { q: "Is Companies House data used in sales intelligence?", a: "Yes. The public Companies House register is the backbone of UK company data. Platforms build on it with enrichment, signals and easier search, filtering and export." },
    ],
    related: [
      { label: "The UK company database explained", href: "/blog/uk-company-database" },
      { label: "UK business leads playbook", href: "/blog/uk-business-leads" },
      { label: "Company monitoring and alerts", href: "/blog/company-monitoring-alerts-uk" },
      { label: "Data sources and provenance", href: "/sources" },
      { label: "Pricing", href: "/pricing" },
    ],
  },

  {
    slug: "find-businesses-without-websites",
    title: "How to Find Businesses Without Websites (for Web Design & SEO Agencies)",
    excerpt:
      "A method for web and SEO agencies to find UK businesses that lack a website or online presence — combining new-company data with a simple presence check.",
    meta_description:
      "Find UK businesses without websites for web design and SEO outreach. Pair new-company register data with a presence check to build a high-response list.",
    body_md: `For a web design or SEO agency, a business with no website — or no real online presence — is a near-perfect prospect: the need is obvious, the pitch is concrete, and response rates are markedly higher than for generic cold lists. The practical method combines two things: a source of relevant businesses (especially newly formed ones, which often have no site yet) and a quick check for whether each already has a web presence. Here is how to run it.

## Why no-website businesses convert

When you can say "I searched for your business and couldn't find a website," you are not selling an abstraction — you are pointing at a gap the owner already half-knows about. Agencies consistently report higher response rates targeting no-website businesses than working broad lists, because the relevance is undeniable and the value proposition is immediate.

## Step 1: Pick the right pool

The richest pool is **newly formed companies**, because many have not yet built a site. New incorporations are public the moment they register, so you can reach them early. See [newly registered companies](/blog/newly-registered-companies-uk) for the mechanics.

Narrow to the kinds of businesses that need a website and can pay for one:

- **Local trades and consumer businesses** — [construction](/industry/construction) and trades, [hospitality](/industry/hospitality), [beauty](/signals/beauty) and local retail are classic web-design targets.
- **A region or city you serve** — for example new businesses in [Leeds](/city/leeds), [Birmingham](/city/birmingham) or [Liverpool](/city/liverpool). Outside London, competition is lower and more businesses still lack sites.

Build that filtered list on the [CompaniesIQ search](/search).

## Step 2: Check for a web presence

For each business on your list, do a fast presence check:

- Search the company name plus its town. No result, or only a directory listing, is a strong signal.
- Check whether a matching domain exists and resolves to a real site.
- Look at whether they appear on Google Maps with a website link, or just a phone number.

A business that shows up only as a Companies House record and a phone number, with no site and no maps listing, is your highest-priority lead. Businesses with an outdated or broken site are a close second — and often an easier sale, because they have already decided a website matters.

## Step 3: Make the outreach specific

Generic pitches fail. Reference what you found:

- Name the business and the gap ("no website I could find for [business] in [town]").
- Show a quick, concrete idea — a one-page mockup or a competitor who is winning the local search they are missing.
- Keep it short and lead with their outcome, not your services.

## Step 4: Stay compliant

This is B2B outreach under PECR and UK GDPR. Keep messages relevant, identify your agency, and offer an easy opt-out. Be especially careful with sole traders, who have stronger protections than registered companies.

## Beyond no-website: presence gaps

The same method extends to broader digital-presence gaps — businesses with a site but no SEO, no Google Business Profile, or an unmaintained presence. For agencies, that widens the addressable pool considerably. The general approach to agency prospecting is covered in [marketing agency leads](/blog/marketing-agency-leads-uk).`,
    faq: [
      { q: "How do I find businesses without a website?", a: "Start with a relevant pool — especially newly formed companies, which often have no site yet — then run a quick presence check on each: search the name plus town, look for a resolving domain, and check Google Maps for a website link." },
      { q: "Why target businesses without websites?", a: "The need is obvious and the pitch is concrete, so response rates are higher than for generic lists. New companies are ideal because many have not yet built a site and the decision is still open." },
      { q: "Where are the best no-website leads?", a: "Local trades and consumer businesses outside London, where competition is lower and more businesses still lack sites — construction and trades, hospitality, beauty and local retail." },
      { q: "Is it legal to contact these businesses?", a: "Yes, as B2B outreach under PECR and UK GDPR: keep it relevant, identify your agency and offer an opt-out. Sole traders have stronger protections than registered companies, so take extra care there." },
    ],
    related: [
      { label: "Marketing agency leads UK", href: "/blog/marketing-agency-leads-uk" },
      { label: "Newly registered companies UK", href: "/blog/newly-registered-companies-uk" },
      { label: "Construction sector data", href: "/industry/construction" },
      { label: "Hospitality companies", href: "/signals/hospitality" },
      { label: "Search the register", href: "/search" },
    ],
  },

  {
    slug: "accounting-leads-new-companies",
    title: "How Accountants Win New Clients from Newly Formed Companies",
    excerpt:
      "A focused playbook for accountancy and bookkeeping firms: turning the daily flow of new incorporations into a steady pipeline of qualified, well-timed clients.",
    meta_description:
      "Win accounting clients from newly formed UK companies: how to find them, the right outreach window, what to lead with, and how to stay compliant.",
    body_md: `For an accountancy or bookkeeping firm, the most dependable source of new clients is the daily flow of newly formed companies on the Companies House register. Each new incorporation is a business that will shortly need help with software, VAT, payroll, Corporation Tax and its first filings — and that usually has no accountant yet. Turning that flow into a pipeline is a repeatable process: find, filter, time, and reach out with genuine help.

## Why new companies fit accountancy so well

The fit is structural. A newly incorporated company has a fixed set of obligations from day one — a confirmation statement, annual accounts, Corporation Tax, possibly VAT and PAYE — and a director who often does not yet understand them. That is precisely the value an accountant adds, and the timing is handed to you by the register. You are not competing to displace an incumbent; you are arriving before there is one.

## Find them on the register

When a company forms, the [register](https://find-and-update.company-information.service.gov.uk/) publishes its name, number, incorporation date, SIC codes, registered office and directors within days — free. That is enough to qualify and personalise. A platform that ingests new formations lets you filter and export rather than checking the website company by company; run it on the [CompaniesIQ search](/search).

## Filter to your firm

Do not chase every new company. Narrow to where you win:

- **Geography** — match your practice area: new companies in [Manchester](/city/manchester), [Nottingham](/city/nottingham), or across [Yorkshire and the Humber](/market/yorkshire-and-the-humber).
- **Specialism** — if you focus on a sector, filter to it: [construction](/industry/construction), [hospitality](/industry/hospitality), [healthcare and social](/industry/healthcare-and-social) or [professional services](/industry/professional-services). Sector specialism lets you charge more and pitch sharper.
- **Recency** — keep inside the outreach window below.

## Time it right

Aim for roughly **one to four weeks after incorporation**. Earlier and the founder is mid-setup; later and they have likely chosen an accountant. The sweet spot is when the admin reality lands but no decision is locked.

## Lead with help, not a pitch

The firms that convert best give value first:

- A short first-year checklist — confirmation statement, accounts deadline, Corporation Tax registration, VAT thresholds.
- A clear explanation of one thing the founder is probably unsure about.
- A specific, low-friction next step.

Address the director by name, reference their company and sector, and keep it human. A generic "we offer accounting services" email is ignored; a relevant, helpful note from someone who clearly looked them up is not.

## Make it a system, not a one-off

The advantage compounds when it is routine: a weekly filtered list of new companies in your area and specialism, a templated-but-personalised first touch, and a simple follow-up sequence. Because the register refreshes daily, the pipeline never runs dry. Consider monitoring specific signals too — see [company monitoring and alerts](/blog/company-monitoring-alerts-uk).

## Stay compliant

Follow PECR and UK GDPR: relevant outreach, clear identification of your firm, and an easy opt-out. Keep a note of why each company is a legitimate prospect. For the wider context, see [newly incorporated companies UK](/blog/newly-incorporated-companies-uk) and the [UK business leads playbook](/blog/uk-business-leads).`,
    faq: [
      { q: "How do accountants get new clients from Companies House?", a: "By monitoring newly incorporated companies, filtering them by location and specialism, and reaching out within the first few weeks with genuine help on their first obligations — before they have appointed an accountant." },
      { q: "What is the best outreach window for new companies?", a: "About one to four weeks after incorporation. The founder is dealing with setup admin and starting to think about compliance, but has usually not yet committed to an accountant." },
      { q: "What should an accountant's first message say?", a: "Lead with value: a short first-year checklist or a clear answer to something the founder is unsure about, personalised to their company and sector, with a low-friction next step — not a generic services pitch." },
      { q: "Is contacting new company directors GDPR-compliant?", a: "Yes, when done under PECR and UK GDPR: keep it relevant, identify your firm and offer an easy opt-out. Take extra care with sole traders, who have stronger protections than registered companies." },
    ],
    related: [
      { label: "Newly incorporated companies UK", href: "/blog/newly-incorporated-companies-uk" },
      { label: "UK business leads playbook", href: "/blog/uk-business-leads" },
      { label: "How to read filing history", href: "/blog/company-filings-history-explained" },
      { label: "Search the register", href: "/search" },
      { label: "Professional services data", href: "/industry/professional-services" },
    ],
  },

  {
    slug: "marketing-agency-leads-uk",
    title: "Marketing Agency Leads: Finding New Businesses That Need You",
    excerpt:
      "How marketing, web and creative agencies can build a steady lead pipeline from UK company data — targeting new businesses with clear, immediate marketing needs.",
    meta_description:
      "Build a marketing agency lead pipeline from UK company data: target new businesses by sector and city, spot presence gaps, and reach decision-makers.",
    body_md: `Marketing, web and creative agencies have a natural lead source most never use systematically: the public register of UK companies. New businesses need branding, a website, SEO and advertising — and they need them early, before habits and suppliers set in. By filtering new formations to the sectors and places you serve, and checking for obvious presence gaps, an agency can build a steady, qualified pipeline instead of relying on referrals and luck.

## Why new businesses are ideal agency prospects

A new company has, almost by definition, an immediate marketing to-do list: a name to establish, a website to build, customers to reach. It also has no incumbent agency. The register tells you who these businesses are and when they formed, so you can arrive while the decisions are open. Compared with chasing established firms that already have an agency, this is far less contested.

## Build the target list

Start from new incorporations and narrow:

- **By sector or theme.** Target sectors that spend on marketing and form in volume — [ecommerce](/signals/ecommerce), [hospitality](/signals/hospitality), [beauty](/signals/beauty), [property](/signals/property) and [professional services](/industry/professional-services).
- **By region or city.** Match where you work — new businesses in [London](/market/london), [Manchester](/city/manchester), [Bristol](/city/bristol) or across [the South East](/market/south-east).
- **By recency.** Keep the list young so you reach founders early.

Run this on the [CompaniesIQ search](/search) and export a working list rather than pulling records one at a time.

## Spot the gap, then pitch it

Generic outreach fails; gap-led outreach works. For each prospect, do a quick check:

- **No website?** A concrete, easy pitch — see [how to find businesses without websites](/blog/find-businesses-without-websites).
- **Site but no SEO or Google Business Profile?** A visibility gap you can quantify.
- **Active in a competitive local market?** Show a competitor winning the search or ads they are missing.

Naming a specific, observable gap turns a cold email into a relevant one.

## Reach the decision-maker

For a new company, the director named on the register is usually the buyer. Knowing their name lets you personalise the approach properly. Combine that with the sector and location context, and your first touch reads as researched rather than blasted.

## Make outreach land

- Reference the specific business and the gap you found.
- Show, don't tell — a quick mockup, a competitor comparison, a single concrete idea.
- Keep it short and lead with their outcome.
- Follow up once or twice, then move on.

## Compliance

This is B2B outreach under PECR and UK GDPR. Keep it relevant, identify your agency, and make opting out easy. Be careful with sole traders, who have stronger protections than registered companies.

## Turn it into a system

The agencies that win here treat it as a routine: a weekly filtered list of new businesses in their niche, a fast presence check, a personalised gap-led first touch, and a light follow-up sequence. Because the register refreshes daily, the pipeline is self-replenishing. For the underlying mechanics, see [newly registered companies](/blog/newly-registered-companies-uk) and the [UK business leads playbook](/blog/uk-business-leads).`,
    faq: [
      { q: "How can a marketing agency find new business leads?", a: "Filter newly formed UK companies by the sectors and cities you serve, check each for marketing gaps (no website, no SEO, weak presence), and reach the named director with a specific, gap-led pitch." },
      { q: "Which sectors are best for agency prospecting?", a: "Sectors that spend on marketing and form in volume: ecommerce, hospitality, beauty, property and professional services. Local consumer businesses outside London are often less contested." },
      { q: "What makes agency outreach convert?", a: "Specificity. Name the business and an observable gap, show a quick concrete idea rather than listing services, personalise to the director, and keep it short and outcome-led." },
      { q: "Do agencies need consent to contact businesses?", a: "B2B outreach is allowed under PECR with conditions — relevance, identification and an easy opt-out. Sole traders and some partnerships have stronger protections, so check the recipient type first." },
    ],
    related: [
      { label: "Find businesses without websites", href: "/blog/find-businesses-without-websites" },
      { label: "Newly registered companies UK", href: "/blog/newly-registered-companies-uk" },
      { label: "Ecommerce companies signal", href: "/signals/ecommerce" },
      { label: "London market data", href: "/market/london" },
      { label: "Search the register", href: "/search" },
    ],
  },

  {
    slug: "who-owns-a-company-uk",
    title: "Who Owns a Company in the UK? Reading the PSC Register",
    excerpt:
      "How to find out who really owns and controls a UK company using the People with Significant Control register — what it shows, its thresholds, and its limits.",
    meta_description:
      "Find who owns a UK company via the People with Significant Control (PSC) register: what it shows, the 25% thresholds, ID-verification reforms and limits.",
    body_md: `To find out who owns a UK company, check its People with Significant Control (PSC) register on Companies House. A PSC — sometimes called a beneficial owner — is an individual or entity that owns or controls the company, and the public record names them, free. Crucially, ownership is not the same as management: directors *run* a company, while PSCs *own or control* it. The two often overlap, but reading them together is how you understand who is really behind a business.

## What a PSC is

A person with significant control meets one or more conditions known as the "nature of control". The main ones are holding, directly or indirectly:

- **More than 25% of the shares**, or
- **More than 25% of the voting rights**, or
- **The right to appoint or remove a majority of the board**, or
- Otherwise exercising **significant influence or control** over the company.

A company can have one PSC, several, or — in some structures — a corporate "relevant legal entity" as its PSC, which you then trace upward.

## How to find it

Search the company on the [Companies House register](https://find-and-update.company-information.service.gov.uk/) and open the "People" tab. Alongside directors you will see the People with Significant Control section, listing each PSC, the nature of their control (which threshold they meet), and the date they became registrable. It is public and free, with no sign-in required.

For each PSC you typically see their name, partial date of birth, nationality, country of residence and the control conditions they meet — similar to the director record covered in our [company director search guide](/blog/company-director-search-uk).

## How current the data is

Companies must keep their PSC information up to date: they update their own register within 14 days of a change and file it with Companies House within a further 14 days, so the public record should reflect changes within about 28 days. Bear that lag in mind when ownership has recently shifted.

## The identity-verification reform

Under the Economic Crime and Corporate Transparency Act, **identity verification for directors and PSCs became mandatory**, rolling out from late 2025. This is a significant improvement: the people named as owners are increasingly verified rather than self-asserted, which strengthens the register for due diligence, KYC and anti-money-laundering checks.

## What ownership data is good for

- **Due diligence and KYC** — confirming who you are really dealing with before contracting or onboarding.
- **Group mapping** — tracing corporate PSCs upward to find ultimate beneficial owners and parent companies.
- **Investment signals** — a new individual crossing the 25% threshold often marks an equity investment, a useful signal covered in [high-growth companies](/blog/high-growth-companies-uk).
- **Risk and conflict checks** — spotting shared ownership across related companies.

## The limits

The PSC register is powerful but not complete. It captures control at the 25%-plus thresholds, so smaller shareholders are not listed there (though the company's filed confirmation statement and any share filings give more detail). Complex offshore or layered structures can still obscure ultimate ownership, which is one reason the identity-verification reforms matter. For anything high-stakes, read the PSC register alongside the filing history rather than relying on it alone — see [how to read filing history](/blog/company-filings-history-explained).`,
    faq: [
      { q: "How do I find out who owns a UK company?", a: "Search the company on Companies House, open the People tab, and read the People with Significant Control (PSC) section. It names those who own or control more than 25% of shares or voting rights, free." },
      { q: "What is a person with significant control (PSC)?", a: "An individual or entity that owns or controls a company — typically holding more than 25% of shares or voting rights, the power to appoint or remove most directors, or otherwise exercising significant control." },
      { q: "Is ownership the same as being a director?", a: "No. Directors run the company day to day; PSCs own or control it. They often overlap, but reading both the officer and PSC records together gives the full picture." },
      { q: "How up to date is the PSC register?", a: "Companies must update their own PSC register within 14 days of a change and file it within a further 14 days, so the public record should reflect changes within about 28 days." },
    ],
    related: [
      { label: "Company director search UK", href: "/blog/company-director-search-uk" },
      { label: "How to read filing history", href: "/blog/company-filings-history-explained" },
      { label: "High-growth companies in the UK", href: "/blog/high-growth-companies-uk" },
      { label: "Search the register", href: "/search" },
      { label: "Data sources and provenance", href: "/sources" },
    ],
  },

  {
    slug: "company-monitoring-alerts-uk",
    title: "Company Monitoring: How to Get Alerts on Directors, Filings and Changes",
    excerpt:
      "How to monitor UK companies for director changes, filings and other events — from the free Companies House 'Follow' feature to systematic watchlists and signals.",
    meta_description:
      "Monitor UK companies for director changes, filings and events using the free Companies House Follow feature or a systematic watchlist for leads and risk.",
    body_md: `To monitor a UK company for changes, the simplest free option is the Companies House "Follow this company" feature, which emails you when that company files accounts or a confirmation statement, or changes its directors or registered office. For watching many companies, spotting patterns, or turning changes into sales or risk signals, you need a more systematic approach. Here is the full range, from free to advanced.

## Why monitor companies at all

Change is signal. A director appointment, a new charge, a filed set of accounts or a shift in ownership each tells you something — that a budget has opened, an investment has landed, a risk has appeared, or an opportunity has arrived. Monitoring is how you act on those events while they are fresh, rather than discovering them months later.

Three groups get the most value:

- **Sales and BD teams** — trigger events mark buying windows.
- **Accountants and advisers** — client and prospect changes prompt timely outreach.
- **Risk, credit and procurement** — supplier or customer changes flag exposure.

## The free option: Follow this company

Companies House offers a free **Follow** service. Find a company on the [register](https://find-and-update.company-information.service.gov.uk/), open its overview, and click "Follow this company". You will then get email alerts when it files key documents or changes officers or its registered office — and the company is never told you are following it. To stop, click "Unfollow".

It is genuinely useful for a handful of companies you care about. Its limits are scale and intelligence: you follow companies one by one, you only get what that single company files, and there is no filtering, scoring or cross-company pattern detection.

## Monitoring at scale

When you need to watch a sector, a region or a whole prospect list, the manual approach breaks down. A monitoring layer on top of the register lets you:

- **Watch by criteria, not just by name** — for example all new [technology](/industry/technology) companies in [Scotland](/market/scotland), or director changes across your client base.
- **Filter the noise** — only the event types that matter to you.
- **Spot cross-company patterns** — a director appearing across several new companies, or a wave of formations in a sector.
- **Route signals into your workflow** — so the right person sees the right change in time.

CompaniesIQ is built around this idea of turning the live register into trackable signals; see the [search](/search) and the [signals](/signals/ai) themes for how events are surfaced by topic.

## The events worth watching

Not every filing matters. The high-signal events are:

- **Director appointments and resignations** — leadership and budget change.
- **PSC changes** — ownership shifts, often investment. See [who owns a company](/blog/who-owns-a-company-uk).
- **Charges and mortgages** — borrowing and capital deployment.
- **Accounts and confirmation statements** — trading status and health. See [how to read filing history](/blog/company-filings-history-explained).
- **New incorporations** in your target sector or region — the freshest opportunity of all.

## Build a monitoring routine

Whether free or systematic, monitoring works best as a habit: define the companies or criteria you care about, choose the event types that matter, and set a regular rhythm for acting on what comes in. The data is public and the alerts are available — the discipline is in turning them into timely action.`,
    faq: [
      { q: "Can I get alerts when a company changes its directors?", a: "Yes. The free Companies House 'Follow this company' feature emails you when a company changes directors or its registered office, or files accounts or a confirmation statement. For many companies at once, use a monitoring platform." },
      { q: "Is Companies House company monitoring free?", a: "Yes. The 'Follow this company' service is free and the followed company is never notified. It works company by company; watching by sector or region at scale needs a dedicated tool." },
      { q: "What company changes are worth monitoring?", a: "High-signal events: director appointments and resignations, PSC (ownership) changes, charges and mortgages, accounts and confirmation statements, and new incorporations in your target sector or region." },
      { q: "How do I monitor many companies at once?", a: "Use a platform that sits on the live register and lets you watch by criteria — sector, region, event type — rather than following each company by hand, and routes the alerts into your workflow." },
    ],
    related: [
      { label: "Company director search UK", href: "/blog/company-director-search-uk" },
      { label: "Who owns a company in the UK", href: "/blog/who-owns-a-company-uk" },
      { label: "How to read filing history", href: "/blog/company-filings-history-explained" },
      { label: "Signals by theme", href: "/signals/ai" },
      { label: "Search the register", href: "/search" },
    ],
  },

  {
    slug: "sic-codes-explained",
    title: "SIC Codes Explained: How to Target Companies by Industry",
    excerpt:
      "What SIC codes are, how the UK uses them on the company register, their quirks and limits, and how to use them to target or analyse companies by industry.",
    meta_description:
      "SIC codes explained: what they are, how Companies House uses them, their limits, and how to target or analyse UK companies by industry.",
    body_md: `A SIC code — Standard Industrial Classification code — is a five-digit number that describes what a company does, recorded against every UK company on the Companies House register. SIC codes are the primary way to filter, target and analyse companies by industry: choose the right codes and you can isolate, say, every new software company or every construction firm in a region. But they have well-known quirks, and using them well means understanding both their power and their limits.

## What a SIC code is

When a company is formed or files a confirmation statement, it declares one or more SIC codes from the official UK list, each describing a type of economic activity. For example, software development, residential construction and management consultancy each have their own code. A company can list several codes if it does more than one thing.

These codes are public and free on the [register](https://find-and-update.company-information.service.gov.uk/), and they are what underpins industry filtering in every company database, including the [sector pages](/industry/technology) on CompaniesIQ.

## How to use them to target

SIC codes turn the register from a pile of companies into a filterable market:

- **Build an industry list.** Select the codes that define your target — for example software and IT codes for [technology](/industry/technology), or building and trades codes for [construction](/industry/construction).
- **Combine with region.** Industry plus place gives a precise list — software companies in [London](/market/london), or construction firms across [the North West](/market/north-west).
- **Combine with recency.** New companies in a SIC band are a lead feed; the whole band is a market map.

Run these combinations on the [CompaniesIQ search](/search).

## The quirks to know

SIC codes are useful but imperfect, and serious users account for it:

- **Self-declared.** Companies choose their own codes, and many pick something broad, generic or slightly wrong — especially at formation, before the business has settled.
- **Sometimes generic.** Codes like "other business support service activities" or "dormant company" carry little information.
- **Multiple codes.** A company with several codes may be genuinely diversified, or may just have hedged at registration.
- **Not always updated.** A pivoting company may keep an outdated code until its next confirmation statement.

Because of this, SIC codes are best treated as a strong first filter, not the final word.

## Going beyond SIC

For activities that do not map cleanly to a code, keyword and theme filtering complements SIC. A fast-moving area like [AI](/signals/ai) or [fintech](/signals/fintech) is often better captured by what a company says about itself than by the code it picked. CompaniesIQ's [signal themes](/signals/saas) combine both approaches — the structured SIC band plus the descriptive term that best surfaces a theme.

## Using SIC for analysis

Beyond targeting, SIC codes power market analysis: counting formations by industry over time, comparing sectors across regions, and spotting where activity is concentrating. Pair that with ONS sector baselines — clearly sourced on the CompaniesIQ [sources](/sources) page — and you can put register activity in proper economic context. Just remember the self-declared caveat when you draw conclusions: SIC tells you what companies *say* they do, which is close to, but not identical with, what they actually do.`,
    faq: [
      { q: "What is a SIC code?", a: "A Standard Industrial Classification code: a five-digit number that describes a company's type of economic activity, declared by the company and recorded on the Companies House register. It is the main way to filter companies by industry." },
      { q: "How do I find a company's SIC code?", a: "Look the company up on Companies House; its SIC code(s) appear on the overview, declared at formation and updated on the confirmation statement. A company can list more than one." },
      { q: "Are SIC codes accurate?", a: "They are self-declared, so treat them as a strong first filter rather than the final word. Companies sometimes pick broad, generic or outdated codes, or list several, so combine SIC with keyword or theme filtering for precision." },
      { q: "How do I target companies by industry?", a: "Select the SIC codes that define your target industry, then combine them with region and recency to build a precise list. For fast-moving themes not captured cleanly by SIC, add keyword or signal filtering." },
    ],
    related: [
      { label: "New business leads from Companies House", href: "/blog/new-business-leads-companies-house" },
      { label: "The UK company database explained", href: "/blog/uk-company-database" },
      { label: "Technology sector data", href: "/industry/technology" },
      { label: "SaaS companies signal", href: "/signals/saas" },
      { label: "Search the register", href: "/search" },
    ],
  },

  {
    slug: "construction-company-leads-uk",
    title: "Construction Company Leads UK: Finding New Builders, Trades and Developers",
    excerpt:
      "How to find new construction, building and trades companies across the UK from the public register, and how suppliers and services can reach them early.",
    meta_description:
      "Find UK construction company leads from the public register: new builders, trades and developers by region, and how suppliers reach them early.",
    body_md: `Construction is one of the highest-volume sectors on the Companies House register, with new building firms, trades and property developers incorporating constantly across the UK. For anyone who sells to the sector — material suppliers, plant hire, insurers, accountants, software vendors, marketers — that steady flow of new companies is a reliable lead source, provided you filter it to the right activities and regions and reach out while the business is still setting up.

## Why construction is a strong lead pool

Two things make construction productive for prospecting. First, **volume**: it is consistently among the most active sectors for new formations, so there is always a fresh supply. Second, **need**: a new construction company quickly requires materials, tools, insurance, accounting, vehicles and a way to win work — many decisions, made early, with no incumbent suppliers. The register hands you the timing.

You can see the sector picture on the [construction industry page](/industry/construction) and track the theme via [construction signals](/signals/construction).

## Find the right companies

The sector is broad, so filter to the part you serve:

- **By activity (SIC code).** Construction spans general building, specialised trades (electrical, plumbing, roofing), civil engineering and property development. Choose the codes that match your customer — see [SIC codes explained](/blog/sic-codes-explained).
- **By region or city.** Construction activity is everywhere but concentrates by area — new firms across [the West Midlands](/market/west-midlands), [Yorkshire and the Humber](/market/yorkshire-and-the-humber), or in cities like [Birmingham](/city/birmingham) and [Leeds](/city/leeds).
- **By recency.** New formations are the warmest leads; reach them before suppliers are chosen.

Build this list on the [CompaniesIQ search](/search) and export it.

## Qualify before you contact

The register lets you screen out weak leads:

- Check the directors — first-time builder or experienced developer with several companies?
- Look at the registered office — a real yard or office, or a formation agent's address?
- For developers, watch for charges (secured borrowing), which often signal a project being financed.

## Reach them well

- Address the named director and reference their company and location.
- Lead with the specific value you offer a new builder — trade credit, faster supply, the right insurance, a simple way to look professional online.
- Keep it short and concrete, and follow up once or twice.

If you sell websites or marketing to trades, many new construction firms have no online presence yet — see [how to find businesses without websites](/blog/find-businesses-without-websites).

## Compliance

This is B2B outreach under PECR and UK GDPR: keep it relevant, identify yourself, and offer an easy opt-out. Many small builders trade as sole traders or partnerships, which have stronger protections than registered companies, so confirm the entity type before contacting.

## Make it repeatable

The same routine that works elsewhere works here: a weekly filtered list of new construction companies in your trade and region, a quick qualification pass, and a personalised first touch. Because the sector forms in such volume, the pipeline rarely runs dry. For the general method, see the [UK business leads playbook](/blog/uk-business-leads).`,
    faq: [
      { q: "How do I find new construction companies in the UK?", a: "Filter the Companies House register for recent incorporations using construction and trades SIC codes, narrowed by region or city. A platform that ingests new formations lets you build and export this list quickly." },
      { q: "Why is construction good for lead generation?", a: "It is one of the highest-volume sectors for new formations, and new building firms need materials, insurance, accounting, vehicles and ways to win work early — many supplier decisions, made with no incumbents." },
      { q: "How do I target a specific trade?", a: "Use the relevant SIC codes — general building, electrical, plumbing, roofing, civil engineering or property development — and combine them with region and recency to isolate the exact trade and area you serve." },
      { q: "Are construction leads compliant to contact?", a: "Yes, as B2B outreach under PECR and UK GDPR. Keep it relevant, identify yourself and offer an opt-out. Many small builders are sole traders or partnerships with stronger protections, so check the entity type." },
    ],
    related: [
      { label: "Construction sector data", href: "/industry/construction" },
      { label: "UK business leads playbook", href: "/blog/uk-business-leads" },
      { label: "SIC codes explained", href: "/blog/sic-codes-explained" },
      { label: "Find businesses without websites", href: "/blog/find-businesses-without-websites" },
      { label: "Search the register", href: "/search" },
    ],
  },

  {
    slug: "recruitment-agency-leads-uk",
    title: "Recruitment Agency Leads: New Companies That Are About to Hire",
    excerpt:
      "How recruitment agencies can use UK company data to find new and growing businesses that are about to hire — and reach the decision-maker before competitors do.",
    meta_description:
      "Find recruitment agency leads from UK company data: new and growing businesses about to hire, by sector and region, reached before competitors.",
    body_md: `Recruitment agencies live and die by timing — placing the right candidate the moment a company needs to hire. UK company data helps you get ahead of that moment. Newly formed and visibly growing companies are the businesses most likely to start hiring soon, and the public register lets you find them by sector and region, identify the decision-maker, and build the relationship before the vacancy is even advertised. Here is how.

## Why new and growing companies hire

A company that has just formed, taken on directors, raised investment or started filing accounts is on a growth path that usually leads to hiring. Catching that company early — before it posts a job, before competitors call — is the whole game in recruitment business development. The register surfaces the signals; you supply the timing and the relationship.

## Find companies on a hiring trajectory

Look for two profiles:

- **Newly formed companies** in sectors that staff up quickly. See [newly registered companies](/blog/newly-registered-companies-uk) for the mechanics.
- **Growing companies** showing momentum signals: new director appointments, ownership changes that suggest investment, or charges indicating capital deployment.

Filter to where you place:

- **By sector or theme.** Recruitment is specialised — target [technology](/industry/technology), [healthcare and social](/industry/healthcare-and-social), [financial services](/industry/financial-services), or fast-staffing themes like [SaaS](/signals/saas) and [care](/signals/care). The [recruitment signal](/signals/recruitment) also tracks staffing firms themselves, useful if you sell *to* recruiters.
- **By region or city.** Match your patch — [London](/market/london), [Manchester](/city/manchester), or across [the South East](/market/south-east).

Build and export the list on the [CompaniesIQ search](/search).

## Read the growth signals

The register hints at hiring before any job board does:

- **Director appointments** — new leadership often precedes team-building.
- **PSC changes** — a new significant shareholder can mean fresh investment and a growth mandate. See [who owns a company](/blog/who-owns-a-company-uk).
- **Charges** — secured borrowing signals expansion.
- **First accounts after formation** — a young company moving from setup to trading.

## Reach the decision-maker first

For a new or growing company, the director on the register is usually the hiring decision-maker. Knowing their name lets you open a relationship — not pitch a vacancy that does not exist yet, but introduce yourself as the specialist who will be ready when they do hire. That early, low-pressure contact is what wins the brief later.

## Outreach that works

- Reference the company, sector and the signal you spotted ("I saw you've just brought on a new director / formed in [sector]").
- Position yourself as the sector specialist, not a generalist.
- Offer something useful — market salary insight, talent availability — rather than asking for a vacancy.
- Follow up lightly and stay on their radar.

## Compliance

Standard B2B rules apply under PECR and UK GDPR: relevance, clear identification and an easy opt-out. Keep your targeting rationale on record. For the broader approach, see the [UK business leads playbook](/blog/uk-business-leads) and [company monitoring and alerts](/blog/company-monitoring-alerts-uk) for tracking growth signals over time.`,
    faq: [
      { q: "How do recruitment agencies find new clients?", a: "By identifying newly formed and visibly growing companies likely to hire soon, filtered by the sectors and regions they place in, then building a relationship with the decision-maker before a vacancy is advertised." },
      { q: "What signals show a company is about to hire?", a: "Recent incorporation in a fast-staffing sector, new director appointments, PSC changes suggesting investment, secured charges indicating expansion, and first accounts as a young company starts trading." },
      { q: "How do I find growing companies in my sector?", a: "Filter the register by the SIC codes or themes you place into, combined with region, and watch for growth signals like director and ownership changes. A platform that surfaces these events makes it systematic." },
      { q: "Is it compliant to contact companies before they advertise a role?", a: "Yes, as relevant B2B outreach under PECR and UK GDPR: identify yourself, keep it relevant to their business, and offer an easy opt-out. Introducing yourself as a sector specialist is legitimate business development." },
    ],
    related: [
      { label: "Newly registered companies UK", href: "/blog/newly-registered-companies-uk" },
      { label: "Company monitoring and alerts", href: "/blog/company-monitoring-alerts-uk" },
      { label: "Recruitment companies signal", href: "/signals/recruitment" },
      { label: "Technology sector data", href: "/industry/technology" },
      { label: "Search the register", href: "/search" },
    ],
  },

  {
    slug: "company-filings-history-explained",
    title: "How to Read a Company's Filing History (Accounts, Confirmation Statements & More)",
    excerpt:
      "A plain-English guide to reading a UK company's filing history on Companies House — what accounts, confirmation statements, charges and other filings actually tell you.",
    meta_description:
      "Read a UK company's filing history with confidence: what accounts, confirmation statements and charges on Companies House actually tell you.",
    body_md: `A UK company's filing history is the public, chronological record of every document it has submitted to Companies House — accounts, confirmation statements, changes to directors and ownership, charges, and more. Reading it well tells you whether a company is healthy, active, growing or in trouble, often before any of that is obvious elsewhere. This guide explains the main filing types in plain English and what each one signals.

## Where to find it

Look up any company on the [Companies House register](https://find-and-update.company-information.service.gov.uk/) and open the "Filing history" tab. Every filing is listed by date with the document available to view, free. The most recent entries are usually the most informative about the company's current state.

## The filings that matter most

### Annual accounts

Accounts are the headline filing. They tell you about the company's finances, though how much detail you get depends on size — small companies file abbreviated or "micro-entity" accounts with limited information, while larger companies file fuller statements. Watch for:

- **Whether accounts are filed on time** — late or overdue accounts are a warning sign.
- **Dormant accounts** — the company is registered but not trading.
- **Trends across years** — growth, decline or stability, where the detail allows.

### Confirmation statement

The confirmation statement (formerly the annual return) confirms that the company's core details — directors, registered office, PSCs, share capital, SIC codes — are up to date. A regularly filed confirmation statement signals an active, compliant company; a missing or overdue one is a red flag.

### Officer changes

Filings for director and secretary appointments and resignations show how leadership has changed over time. A sudden change of directors, or rapid turnover, is worth understanding before you rely on a company.

### PSC filings

Changes to people with significant control reveal ownership shifts — often the footprint of investment or restructuring. See [who owns a company in the UK](/blog/who-owns-a-company-uk) for how to read these.

### Charges and mortgages

A charge is security a company has given against borrowing. New charges signal that the company has raised secured finance — usually a sign of investment or expansion, occasionally of financial pressure. The presence and pattern of charges is one of the most useful signals in the whole history.

## Reading the history as a story

Individual filings are facts; the sequence is the insight. Read top to bottom and you can often see:

- A young company moving from formation to first accounts — see [newly registered companies](/blog/newly-registered-companies-uk).
- A growth phase — new directors, a PSC change suggesting investment, a charge for borrowing.
- Stability — accounts and confirmation statements filed on time, year after year.
- Distress — overdue filings, resignations, or filings related to insolvency.

## Watch for the warning signs

For due diligence, credit or supplier decisions, the clearest red flags in a filing history are:

- **Overdue accounts or confirmation statements** — non-compliance, often a symptom of deeper problems.
- **Frequent director resignations** — instability.
- **Insolvency-related filings** — administration, liquidation or strike-off action.

## Use it alongside other data

Filing history is strongest read together with the rest of the record — directors, PSCs and SIC codes — and put in context with sector and regional data. CompaniesIQ keeps its company data live against Companies House and is explicit about provenance on its [sources](/sources) page, so what you read reflects the current register rather than an old snapshot.`,
    faq: [
      { q: "What is a company's filing history?", a: "The public, dated record on Companies House of every document a company has submitted — accounts, confirmation statements, officer and PSC changes, charges and more. It is free to view and shows the company's activity over time." },
      { q: "What do annual accounts tell you?", a: "A company's financial position, with detail depending on its size — small companies file limited information. Filing on time signals health; dormant accounts mean it is not trading; overdue accounts are a warning sign." },
      { q: "What is a confirmation statement?", a: "An annual filing confirming the company's core details — directors, registered office, PSCs, share capital and SIC codes — are correct. Regular filing signals an active, compliant company; an overdue one is a red flag." },
      { q: "What does a charge on a company mean?", a: "A charge is security given against borrowing. New charges usually signal that the company has raised secured finance for investment or expansion, occasionally indicating financial pressure — context matters." },
    ],
    related: [
      { label: "Who owns a company in the UK", href: "/blog/who-owns-a-company-uk" },
      { label: "Company director search UK", href: "/blog/company-director-search-uk" },
      { label: "Company monitoring and alerts", href: "/blog/company-monitoring-alerts-uk" },
      { label: "Data sources and provenance", href: "/sources" },
      { label: "Search the register", href: "/search" },
    ],
  },

  {
    slug: "high-growth-companies-uk",
    title: "Finding High-Growth and Funded Companies in the UK",
    excerpt:
      "How to identify high-growth and funded UK companies using public register signals — what you can see for free, what requires enrichment, and how to read the clues.",
    meta_description:
      "Identify high-growth and funded UK companies from public register signals: PSC changes, charges, director hires and formations — plus enrichment.",
    body_md: `High-growth and funded companies are the most sought-after targets for investors, sales teams, recruiters and partners — and while the Companies House register does not label a company "high-growth", it carries the signals that point to one. Ownership changes, secured borrowing, experienced new directors and patterns of formation all hint at momentum and investment. This guide explains which signals you can read for free, which need enrichment, and how to combine them.

## What "high-growth" means in the data

There is no official high-growth flag on the register. In practice, you infer it from a cluster of signals that, together, suggest a company is scaling and attracting capital. No single signal is conclusive; the pattern is what matters.

## Signals you can read for free

### Ownership changes (PSCs)

When a new individual or entity crosses the 25% threshold and appears as a person with significant control, it often marks an equity investment or a significant restructuring. A change in the PSC register is one of the clearest free signals of a funding event — see [who owns a company in the UK](/blog/who-owns-a-company-uk).

### Charges and mortgages

A new charge means the company has raised secured finance — venture debt, a bank facility, asset finance. The presence and timing of charges is a strong indicator of capital being deployed for growth. Learn to read them in [how to read filing history](/blog/company-filings-history-explained).

### Experienced new directors

When a young company appoints directors with strong track records — people who have run or scaled other companies — it often signals ambition and outside backing. You can trace those track records via the [company director search](/blog/company-director-search-uk).

### Formation patterns

Clusters of related new companies, or a founder spinning up a new venture, can mark the start of a high-growth story. New formations in hot sectors are covered in [startup database UK](/blog/startup-database-uk).

## Where to look

High-growth activity concentrates by sector and place:

- **Sectors and themes** — [AI](/signals/ai), [fintech](/signals/fintech), [SaaS](/signals/saas) and [cleantech](/signals/cleantech) dominate venture-backed formation; the broader [technology](/industry/technology) and [financial services](/industry/financial-services) pages give the market context.
- **Places** — [London](/market/london) leads, with strong clusters in [Manchester](/city/manchester), [Edinburgh](/city/edinburgh), [Cambridge](/city/cambridge) and [Bristol](/city/bristol).

Run combined sector-and-region searches on the [CompaniesIQ search](/search).

## What the register won't tell you

Be realistic about the limits. The register does not show:

- Funding round sizes or valuations
- Named investors beyond those who become PSCs
- Revenue, growth rates or headcount

Specialist providers model and collect some of this — for example platforms focused specifically on high-growth and venture-backed companies. CompaniesIQ deliberately stays close to the live official record and is clear on its [sources](/sources) page about what is live versus reference data, rather than presenting modelled figures as fact.

## Putting it together

The reliable method is to combine signals: a young company, in a high-growth sector, that has just had a PSC change and registered a charge, and brought in an experienced director, is far more likely to be genuinely scaling than one showing any single signal alone. Read the pattern, confirm it in the filing history, and you have a high-quality shortlist — built entirely from public data.`,
    faq: [
      { q: "How can I find high-growth companies in the UK?", a: "Read the register for clustered growth signals — PSC (ownership) changes, new charges, experienced new directors and formation patterns — in high-growth sectors and regions. The pattern, not any single signal, indicates real growth." },
      { q: "Can I see if a company has raised funding on Companies House?", a: "Partly. New investors crossing 25% appear as people with significant control, and secured finance shows as charges. Round sizes, valuations and most investor names are not on the register and require specialist data." },
      { q: "Which sectors have the most high-growth UK companies?", a: "Venture-backed growth concentrates in AI, fintech, SaaS and cleantech, within the broader technology and financial-services sectors, and clusters geographically around London, Manchester, Edinburgh, Cambridge and Bristol." },
      { q: "What growth signals are strongest?", a: "A PSC change (often investment) and a new charge (secured finance) are the clearest free signals, especially together with an experienced new director at a young company in a high-growth sector." },
    ],
    related: [
      { label: "Startup database UK", href: "/blog/startup-database-uk" },
      { label: "Who owns a company in the UK", href: "/blog/who-owns-a-company-uk" },
      { label: "How to read filing history", href: "/blog/company-filings-history-explained" },
      { label: "Fintech companies signal", href: "/signals/fintech" },
      { label: "Search the register", href: "/search" },
    ],
  },

  {
    slug: "companies-formed-today-uk",
    title: "Companies Formed Today: How to See New UK Registrations Daily",
    excerpt:
      "How to see UK companies formed today or this week, why a daily view of new registrations is so valuable, and the practical ways to build or access one.",
    meta_description:
      "See UK companies formed today or this week: why a daily view of new registrations matters and the practical ways to build or access one.",
    body_md: `Companies are added to the UK register every working day, and you can see them — but not easily through the free Companies House website, which is built for looking up companies you already know rather than listing everything registered today. To get a daily view of new UK registrations you either work with the Companies House data feeds and API, or use a platform that ingests new incorporations continuously. Here is why a daily view matters and how to get one.

## Why "today" matters

The value of a new company as a prospect or signal is highest the moment it appears and decays from there. A company formed today has made almost none of its supplier, software or advisory decisions. By the time it shows up in a monthly bought list, several of those decisions are gone. A daily — even same-day — view is what lets accountants, agencies, banks, insurers and sales teams reach a business first. The mechanics of that timing are covered in [newly registered companies UK](/blog/newly-registered-companies-uk).

## What each new registration carries

Every company formed today is published with, free:

- Company name, number and incorporation date
- SIC codes describing its intended activity
- Registered office address
- Directors and people with significant control

That is enough to qualify and route the lead the same day it appears.

## Why the free website is not enough

The [Companies House register](https://find-and-update.company-information.service.gov.uk/) is authoritative but not designed for this job. It has no "show me everything formed today" view, no date-range list you can export, and no sector or region filter on a new-formation feed. You can confirm a single company, but you cannot pull the day's cohort.

## How to get a daily view

Three practical routes:

1. **Companies House API and data products.** Companies House offers an API and bulk data. With development effort you can assemble a daily feed of new incorporations. This is the most flexible and the most work.
2. **Bought daily or weekly files.** Some providers sell regular new-company files. Convenient, but you share the list with every other buyer and contact-data quality varies.
3. **An intelligence platform.** A tool that ingests new formations continuously and lets you filter the day's registrations by sector and region, then export. This is the job [CompaniesIQ](/search) is built for, kept live against the source.

## Make the daily flow usable

A raw daily feed of every new company is overwhelming. Filter it down to a workable cohort:

- **By sector or theme** — only the industries you serve, such as [technology](/industry/technology), [construction](/industry/construction) or [hospitality](/signals/hospitality).
- **By region or city** — the areas you cover, like [London](/market/london), [the North West](/market/north-west) or [Glasgow](/city/glasgow).

Two filters turn thousands of daily registrations into a short, relevant list you can actually act on the same day.

## Turn it into a routine

The teams that benefit most check the day's relevant new formations as a habit — a short, filtered list each morning, qualified quickly and acted on while the companies are brand new. Because the register refreshes every working day, the supply is constant. For the full prospecting method, see the [UK business leads playbook](/blog/uk-business-leads), and for staying on top of changes over time, [company monitoring and alerts](/blog/company-monitoring-alerts-uk).`,
    faq: [
      { q: "Can I see companies formed today in the UK?", a: "Yes, but not easily on the free Companies House website, which has no same-day list or export. You need the Companies House API and data products, a bought daily file, or a platform that ingests new formations continuously." },
      { q: "Why does seeing new registrations daily matter?", a: "A new company's value as a prospect is highest the moment it forms and decays quickly, because supplier, software and advisory decisions get made fast. A daily view lets you reach businesses before competitors do." },
      { q: "How many companies are formed in the UK each day?", a: "Thousands of companies are incorporated on a typical working day, adding up to hundreds of thousands a year on the Companies House register, though the daily figure fluctuates." },
      { q: "How do I make a daily new-company feed usable?", a: "Filter it by the sectors and regions you serve. Two filters — industry and location — turn thousands of daily registrations into a short, relevant cohort you can qualify and act on the same day." },
    ],
    related: [
      { label: "Newly registered companies UK", href: "/blog/newly-registered-companies-uk" },
      { label: "Newly incorporated companies UK", href: "/blog/newly-incorporated-companies-uk" },
      { label: "UK business leads playbook", href: "/blog/uk-business-leads" },
      { label: "Company monitoring and alerts", href: "/blog/company-monitoring-alerts-uk" },
      { label: "Search the register", href: "/search" },
    ],
  },
];

async function main() {
  const status = DRAFT ? "draft" : "published";
  console.log(`Seeding ${ARTICLES.length} blog posts as ${status} → ${REST}`);

  // Stagger published_at so index 0 (highest priority) sorts newest.
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

  // Validate every internal /blog/ link points at a slug we are publishing.
  const slugs = new Set(ARTICLES.map((a) => a.slug));
  let linkWarnings = 0;
  for (const a of ARTICLES) {
    const bodyRefs = [...a.body_md.matchAll(/\]\(\/blog\/([a-z0-9-]+)\)/g)].map((m) => m[1]);
    const relRefs = (a.related || []).map((r) => r.href).filter((h) => h.startsWith("/blog/")).map((h) => h.slice(6));
    for (const ref of [...bodyRefs, ...relRefs]) {
      if (!slugs.has(ref)) {
        console.warn(`  ! ${a.slug}: links to unknown blog slug /blog/${ref}`);
        linkWarnings++;
      }
    }
  }
  if (linkWarnings) console.warn(`  ${linkWarnings} internal blog-link warning(s) — fix before relying on them.`);
  else console.log("  ✓ All internal /blog/ links resolve to published slugs.");

  const res = await fetch(`${REST}?on_conflict=slug`, {
    method: "POST",
    headers,
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    console.error(`✗ Upsert failed ${res.status}: ${(await res.text()).slice(0, 500)}`);
    process.exit(1);
  }
  console.log(`✓ Upserted ${rows.length} posts (${status}).`);
}

main().catch((e) => {
  console.error("✗", e);
  process.exit(1);
});
