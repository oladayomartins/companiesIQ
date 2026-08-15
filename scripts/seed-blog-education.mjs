// Round-3 blog content — the educational "Know" layer. Where rounds 1-2 were
// commercial/buyer-intent, these are definitional/informational articles that
// build topical authority around UK company data and funnel into the product
// and the new commercial pages (/company-database, /companies-house-alternative,
// /company-monitoring, /sic, /use-cases). Same publishing path as
// scripts/seed-blog-round2.mjs (Supabase REST upsert on slug) and it validates
// every internal /blog/ link against the LIVE published set + this batch.
//
// Accuracy rules: genuine E-E-A-T, clean British English, answer-first intros,
// H2/H3 + bullets + FAQ. Never fabricate statistics — attribute to Companies
// House / GOV.UK / ONS. Where figures drift (filing fees, thresholds), link to
// GOV.UK for the current value rather than asserting a number that may age.
//
// Usage:  node scripts/seed-blog-education.mjs            # publish/refresh
//         node scripts/seed-blog-education.mjs --draft    # insert as drafts
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
  // ------------------------------------------------------------ Pillar: how CH works
  {
    slug: "how-companies-house-works",
    title: "How Companies House Works: The UK Register Explained",
    excerpt:
      "Companies House is the UK's official registrar of companies. Here's what it is, what's on the register, what companies must file, and how to actually use the data.",
    meta_description:
      "How Companies House works: the UK's official company register — what it holds, what companies must file, and how to use the data for research and prospecting.",
    body_md: `Companies House is the UK's official registrar of companies — the government body that incorporates new companies, maintains the public register of every UK company, and makes that information freely available. If you have ever looked up a company's directors, accounts or filing history, you were using Companies House data. This guide explains what it is, what's on the register, what companies are legally required to file, and how to turn that raw public record into something useful.

## What Companies House is

Companies House is an executive agency of the UK government. Its core jobs are to **incorporate and dissolve companies**, **examine and store the information companies must send it**, and **make that information available to the public**. Almost everything on the register is public by law — which is why company data is such a rich, free resource for research, due diligence and sales.

There are separate registers for England & Wales, Scotland and Northern Ireland, all searchable through the same [official register](https://find-and-update.company-information.service.gov.uk/).

## What's on the register

For each of the UK's ~5 million-plus companies, the register holds:

- **Core details** — company name, number, type, incorporation date, registered office address, and [SIC codes](/sic) describing what the company does.
- **People** — current and past directors and secretaries, and [persons with significant control](/blog/who-owns-a-company-uk) (who ultimately owns or controls the company).
- **Filing history** — accounts, confirmation statements, officer changes and more, each dated. See [how to read a filing history](/blog/company-filings-history-explained).
- **Charges** — mortgages and secured borrowing registered against the company.
- **Status** — whether the company is active, dormant, dissolved or in an insolvency process. See [company status meanings](/blog/company-status-meanings).

## What companies must file

Every company has ongoing obligations. The main recurring filings are:

- **Annual accounts** — a financial report each year, in a format that depends on the company's size. See [company accounts explained](/blog/company-accounts-explained).
- **A confirmation statement** — at least once a year, confirming the register is up to date. See [what a confirmation statement is](/blog/confirmation-statement-explained).
- **Event-driven filings** — appointing or removing a director, changing the registered office, issuing shares, or registering a charge.

Deadlines and fees are set by Companies House and change over time — always check the current requirements on [GOV.UK](https://www.gov.uk/government/organisations/companies-house).

## The limits of the free register

The register is authoritative and free, but it is built for **looking up one company at a time**. It has no bulk filtering, no market roll-ups, and no alerts when something changes. If you need to search across the whole register — for example every new company in a [sector](/industry/technology) and [region](/market/london) — you need a layer on top of it. That's the gap tools like a [Companies House alternative](/companies-house-alternative) fill.

## Turning the register into intelligence

The same public data supports very different jobs:

- **Research** — understand a single company's people, ownership and filings. Start with [how to research a UK company](/blog/how-to-research-a-uk-company).
- **Prospecting** — find [newly registered companies](/blog/newly-registered-companies-uk) to sell to, filtered by sector and location, from the [UK company database](/company-database).
- **Monitoring** — track companies and get told when they file or change directors. See [company monitoring](/company-monitoring).

Companies House provides the raw, trustworthy record; what you do with it depends on your job. To see the live register in a form built for searching and filtering, [try a search](/search) or get a [free weekly email of new companies](/free-alerts) in your sector.`,
    faq: [
      { q: "What is Companies House?", a: "Companies House is the UK government's official registrar of companies. It incorporates and dissolves companies, stores the information companies are required to file, and makes most of that information freely available to the public." },
      { q: "Is Companies House data free?", a: "Yes. The register is free to search and most filings can be viewed at no cost, because company information is public by law. Commercial tools add value on top — bulk search, filtering, analysis and alerts — but the underlying record is free." },
      { q: "What do companies have to file at Companies House?", a: "Every company must file annual accounts and a confirmation statement at least once a year, plus event-driven filings such as director changes, a new registered office, share issues and charges. Deadlines and fees are set by Companies House." },
      { q: "How do I search Companies House?", a: "You can search the official register by company name or number on GOV.UK. For searching across the whole register — by sector, region or recency — and for alerts on changes, a company-intelligence platform that queries the register live is the better tool." },
    ],
    related: [
      { label: "How to research a UK company", href: "/blog/how-to-research-a-uk-company" },
      { label: "Company accounts explained", href: "/blog/company-accounts-explained" },
      { label: "SIC code search", href: "/sic" },
      { label: "The UK company database", href: "/company-database" },
      { label: "Free weekly new-company alerts", href: "/free-alerts" },
    ],
  },

  // ------------------------------------------------------------ Pillar: how to research a company
  {
    slug: "how-to-research-a-uk-company",
    title: "How to Research a UK Company: A Step-by-Step Guide",
    excerpt:
      "A practical, step-by-step way to research any UK company from public data — its people, ownership, finances, filings and red flags — and what each source tells you.",
    meta_description:
      "How to research a UK company step by step: check its people, ownership, accounts, filing history and status from public Companies House data — and spot red flags.",
    body_md: `To research a UK company, start with the public Companies House record and work outward: confirm it exists and is active, check who runs and owns it, read its accounts and filing history, and look for signals — charges, address changes, resignations — that add context. Almost everything you need is public and free. This guide walks through each step and what it actually tells you.

## Step 1 — Confirm the company and its status

Search the company by name or number and confirm the basics: it is a real, registered company, its [status](/blog/company-status-meanings) is *active* (not dissolved or in liquidation), and its incorporation date. A company that formed last week is a very different prospect — or risk — from one trading for twenty years. You can browse companies by [industry](/industry/technology), [region](/market/london) or [city](/city/manchester) to put one in context.

## Step 2 — Check the people

Look at the **directors and secretaries**: who they are, when they were appointed, and what other companies they run. A director with a long trail of dissolved companies is worth noting. See [company director search](/blog/company-director-search-uk) for how to follow a person across companies.

## Step 3 — Check ownership and control

Directors run a company day to day, but the **[persons with significant control](/blog/who-owns-a-company-uk) (PSCs)** ultimately own or control it — typically anyone holding more than 25% of shares or voting rights. The PSC record tells you who is really behind the business, and a recent PSC change often marks a sale or investment.

## Step 4 — Read the accounts

A company's [annual accounts](/blog/company-accounts-explained) show its financial position — though how much detail you get depends on its size, as small and micro companies file less. Look at net worth, whether accounts are filed on time, and the trend across years. Late or overdue accounts are a genuine red flag.

## Step 5 — Read the filing history

The [filing history](/blog/company-filings-history-explained) is a dated timeline of everything the company has told Companies House. Scan it for pattern and pace: frequent officer changes, a new [charge](/blog/company-filings-history-explained) (secured borrowing), or a registered-office move can all be meaningful in context.

## Step 6 — Watch for change

Research is a snapshot; companies change. If the company matters to you — a prospect, a supplier, a competitor — track it and get alerted when it files, changes directors or moves. That's what [company monitoring](/company-monitoring) is for.

## Doing this at scale

Researching one company is a manual job. Researching *many* — every new company in your market, say — needs a tool that searches the live register in bulk and assembles each company's people, ownership and filings into one report. That's the difference between the free register and a [company database](/company-database) built for research and prospecting. Different jobs use it differently — see the [use-case guides](/use-cases) for accountants, recruiters, agencies and sales teams.

Ready to try it on a real company? [Search the live register](/search), or read [how Companies House works](/blog/how-companies-house-works) for the foundations.`,
    faq: [
      { q: "How do I research a UK company for free?", a: "Use the public Companies House register: confirm the company and its status, check its directors and persons with significant control, read its accounts and filing history, and note any charges or recent changes. All of this is public and free." },
      { q: "What are the red flags when researching a company?", a: "Overdue or late accounts, a director with many dissolved companies, frequent registered-office or officer changes, a very recent incorporation presented as an established firm, and a status of dissolved or in liquidation. Each is context, not proof — weigh them together." },
      { q: "How do I find out who owns a UK company?", a: "Check the persons with significant control (PSC) record on the register — usually anyone holding more than 25% of shares or voting rights, or with rights to control the company. Directors run it; PSCs ultimately own or control it." },
      { q: "Can I research many companies at once?", a: "Not through the free register, which is built for single lookups. A company-intelligence platform that queries the register live lets you search in bulk by sector, region and recency, and assemble each company's data into one report." },
    ],
    related: [
      { label: "How Companies House works", href: "/blog/how-companies-house-works" },
      { label: "Who owns a company in the UK?", href: "/blog/who-owns-a-company-uk" },
      { label: "How to read a filing history", href: "/blog/company-filings-history-explained" },
      { label: "The UK company database", href: "/company-database" },
      { label: "Search the live register", href: "/search" },
    ],
  },

  // ------------------------------------------------------------ Company types
  {
    slug: "uk-company-types-explained",
    title: "UK Company Types Explained: Ltd, PLC, LLP, CIC & More",
    excerpt:
      "A plain-English guide to the main UK company and business types — private limited (Ltd), PLC, LLP, CIC and sole trader — and how to tell them apart on the register.",
    meta_description:
      "UK company types explained: private limited (Ltd), PLC, LLP, CIC, guarantee companies and sole traders — what each means and how to spot them on the register.",
    body_md: `The UK has several business structures, and the type tells you a lot about a company — how it's owned, who's liable, and what it must file. The most common is the **private company limited by shares (Ltd)**, but you'll also meet PLCs, LLPs, community interest companies and structures that aren't companies at all, like sole traders. Here's how to tell them apart and why it matters.

## Private limited company (Ltd)

By far the most common type on the register. An **Ltd** is limited by shares, owned by shareholders, and run by directors; the owners' liability is limited to what they've invested. It must file [annual accounts](/blog/company-accounts-explained) and a [confirmation statement](/blog/confirmation-statement-explained). When people say "a company," this is usually what they mean.

## Public limited company (PLC)

A **PLC** can offer its shares to the public and may be listed on a stock exchange. PLCs face stricter requirements — a higher minimum share capital and fuller reporting — and are far fewer in number than private companies.

## Limited liability partnership (LLP)

An **LLP** blends a partnership with limited liability. It's owned by *members* rather than shareholders and is common among professional firms — solicitors, accountants and consultancies. LLPs register at Companies House and file accounts, but their internal structure differs from a company limited by shares.

## Company limited by guarantee

Instead of shareholders, a **guarantee company** has members who agree to contribute a nominal amount if it's wound up. It's a common structure for clubs, charities, membership bodies and social enterprises, where there are no profits to distribute to owners.

## Community interest company (CIC)

A **CIC** is a company created for social or community benefit, with an "asset lock" that keeps its assets working for that purpose. CICs are regulated in addition to Companies House and are easy to spot by the CIC suffix.

## Sole trader (not a company)

A **sole trader** is an individual running a business in their own name. Crucially, sole traders are **not** registered at Companies House and have no company number — they register with HMRC for tax instead. This matters for research and outreach: you won't find a sole trader on the register, and they carry stronger personal-data protections than a registered company.

## Why the type matters

- **For research** — the type shapes what a company must file and how much financial detail you'll see.
- **For prospecting** — targeting by structure (e.g. LLPs for professional-services outreach) can sharpen a list. Combine it with [SIC codes](/sic) and [region](/market/london) to focus.
- **For compliance** — sole traders and some partnerships have stronger protections than companies, so confirm the entity type before any outreach.

You can see the mix of types forming in any [sector](/industry/professional-services) or [city](/city/manchester) on the live register. For the official definitions, see the [GOV.UK guide to business structures](https://www.gov.uk/business-legal-structures).`,
    faq: [
      { q: "What is the most common type of UK company?", a: "The private company limited by shares (Ltd) — owned by shareholders, run by directors, with liability limited to what owners invest. It's by far the most common structure on the Companies House register." },
      { q: "What's the difference between an Ltd and a PLC?", a: "A private limited company (Ltd) cannot offer shares to the public; a public limited company (PLC) can, and may be stock-market listed. PLCs face a higher minimum share capital and stricter reporting, and are far fewer in number." },
      { q: "Are sole traders on Companies House?", a: "No. Sole traders are individuals trading in their own name and are not registered at Companies House, so they have no company number. They register with HMRC for tax instead, and carry stronger personal-data protections than registered companies." },
      { q: "What is a CIC?", a: "A community interest company (CIC) is a company set up for social or community benefit, with an 'asset lock' ensuring its assets are used for that purpose. CICs are regulated in addition to Companies House." },
    ],
    related: [
      { label: "How Companies House works", href: "/blog/how-companies-house-works" },
      { label: "Company accounts explained", href: "/blog/company-accounts-explained" },
      { label: "SIC code search", href: "/sic" },
      { label: "Professional services companies", href: "/industry/professional-services" },
      { label: "Search the live register", href: "/search" },
    ],
  },

  // ------------------------------------------------------------ Company accounts
  {
    slug: "company-accounts-explained",
    title: "Company Accounts Explained: Dormant, Micro-Entity & Small",
    excerpt:
      "What UK company accounts are, why the level of detail varies by company size, and how to read dormant, micro-entity and small-company accounts on the register.",
    meta_description:
      "UK company accounts explained: why detail varies by size, and how to read dormant, micro-entity and small-company accounts filed at Companies House.",
    body_md: `Company accounts are the annual financial statements every UK company must file at Companies House. How much detail you see depends on the company's **size**: small, micro-entity and dormant companies are allowed to file less than large ones. Understanding the format is the key to reading — and not over-reading — what a company has filed. Here's what the main types mean.

## Why accounts exist

Every registered company must prepare and file annual accounts, so that owners, lenders, suppliers and the public can see its financial position. Accounts are filed for each financial year, and there are filing deadlines — generally within nine months of the year end for a private company, with different rules for a company's first accounts. Deadlines and any late-filing penalties are set by Companies House; check the current rules on [GOV.UK](https://www.gov.uk/annual-accounts).

## The main types you'll see

- **Full accounts** — the fullest picture: profit and loss, balance sheet and notes. Larger companies file these.
- **Small-company accounts** — companies that meet the "small" thresholds can file reduced accounts, often without a full profit-and-loss account. Most companies you research fall here.
- **Micro-entity accounts** — the very smallest companies file a highly simplified balance sheet with minimal notes. Useful for confirming existence and rough net worth, but light on detail.
- **Dormant company accounts** — a [dormant company](/blog/company-status-meanings) has had no significant transactions in the year and files very simple accounts confirming that. Dormant doesn't mean defunct — it's often a company holding a name, an asset or a future plan.

## How to read them

A few practical points:

- **Detail scales with size.** Don't read a lack of a profit figure as evasion — small and micro companies are *entitled* to omit it. Judge a company against the format it's allowed to file.
- **Look at the trend, not one year.** Net worth rising or falling across several years tells you more than a single snapshot.
- **Timeliness matters.** Late or overdue accounts are a red flag worth weighing alongside everything else — see [how to research a UK company](/blog/how-to-research-a-uk-company).

## Accounts as a signal

For prospecting and monitoring, accounts are a rich signal beyond the numbers themselves. A first set of non-dormant accounts can mark a company starting to trade; a jump in size can mark growth. Tracking when companies file — and surfacing those with overdue accounts — is one way teams use the register. See [company monitoring](/company-monitoring), or the wider [UK company database](/company-database) for filtering companies by what they've filed.

To see accounts in context on a real company, [search the live register](/search). For how filings fit together, read [how to read a filing history](/blog/company-filings-history-explained).`,
    faq: [
      { q: "Do all UK companies have to file accounts?", a: "Yes. Every registered company must file annual accounts at Companies House each year, including dormant companies. The format and level of detail depend on the company's size, from full accounts down to micro-entity and dormant accounts." },
      { q: "What are dormant company accounts?", a: "Accounts filed by a company that has had no significant accounting transactions in the financial year. They're very simple and confirm the dormant position. Dormant doesn't mean closed — companies stay dormant to hold a name, an asset or a plan for later." },
      { q: "Why do some companies show so little financial detail?", a: "Because small and micro-entity companies are legally allowed to file reduced accounts — often without a full profit-and-loss account. It's not evasion; judge a company against the format it's entitled to file for its size." },
      { q: "Are overdue accounts a red flag?", a: "They can be. Late or overdue accounts are worth noting when assessing a company, alongside its status, directors and filing history. Treat it as context rather than proof, and weigh it with the rest of the record." },
    ],
    related: [
      { label: "How to research a UK company", href: "/blog/how-to-research-a-uk-company" },
      { label: "How to read a filing history", href: "/blog/company-filings-history-explained" },
      { label: "Company status meanings", href: "/blog/company-status-meanings" },
      { label: "Company monitoring", href: "/company-monitoring" },
      { label: "Search the live register", href: "/search" },
    ],
  },

  // ------------------------------------------------------------ Confirmation statement
  {
    slug: "confirmation-statement-explained",
    title: "What Is a Confirmation Statement? (UK Companies)",
    excerpt:
      "A confirmation statement is the annual filing that confirms a UK company's key details are up to date. Here's what it covers, who files it, and why it matters for research.",
    meta_description:
      "What is a confirmation statement? The annual filing confirming a UK company's details are up to date at Companies House — what it covers and why it matters.",
    body_md: `A confirmation statement is a filing that every UK company must make at least once a year to confirm that the key information on the public register is accurate and up to date. It replaced the old "annual return" in 2016. It doesn't contain financial figures — it's a check that Companies House holds the right details about the company. Here's what it covers and why it's useful to know about.

## What it confirms

When a company files a confirmation statement, it confirms (or updates) the core register information, including:

- The **registered office** address and, where used, the SAIL address for records.
- The **directors and secretary**.
- The **[persons with significant control](/blog/who-owns-a-company-uk)** — who owns or controls the company.
- The **[SIC codes](/sic)** describing the company's activities.
- The **statement of capital and shareholders** for companies with shares.

If any of these changed during the year and weren't already updated, the statement is the moment to bring the register into line.

## Who files it and when

Every active company — and every LLP — must file a confirmation statement at least once every 12 months, even a [dormant company](/blog/company-status-meanings). There's a review period and a filing deadline set by Companies House, and a filing fee applies; the current fee and deadlines are on [GOV.UK](https://www.gov.uk/guidance/confirmation-statement). Failing to file is a serious matter and can ultimately lead to the company being struck off.

## Why it matters for research

The confirmation statement is quietly useful when you're researching or monitoring a company:

- **It dates the register's accuracy.** A recent statement means the people and control data have recently been confirmed.
- **It can reveal changes.** Updates to PSCs, SIC codes or capital filed with the statement can mark ownership changes, a shift in what the company does, or new investment.
- **A missing one is a signal.** A company overdue on its confirmation statement, like one overdue on [accounts](/blog/company-accounts-explained), is worth a second look.

## Where it fits

The confirmation statement sits alongside annual accounts as one of the two filings almost every company makes each year — see [how Companies House works](/blog/how-companies-house-works) for the full picture, and [how to read a filing history](/blog/company-filings-history-explained) to place it in a company's timeline. To watch for these filings as they happen across companies you care about, see [company monitoring](/company-monitoring), or [search the live register](/search) to view a real company's statements.`,
    faq: [
      { q: "What is a confirmation statement?", a: "It's an annual filing that confirms a UK company's key register details — registered office, directors, persons with significant control, SIC codes and share capital — are accurate and up to date. It replaced the annual return in 2016 and contains no financial figures." },
      { q: "How often must a confirmation statement be filed?", a: "At least once every 12 months, by every active company and LLP, including dormant companies. There's a review period and a filing deadline set by Companies House, and a filing fee applies — check GOV.UK for current details." },
      { q: "What happens if a company doesn't file one?", a: "Failing to file a confirmation statement is a serious compliance failure and can ultimately lead to the company being struck off the register. An overdue confirmation statement is a useful red flag when assessing a company." },
      { q: "Does a confirmation statement show financial information?", a: "No. It confirms the company's structural details — office, officers, ownership, activities and share capital — not its finances. Financial information is filed separately in the company's annual accounts." },
    ],
    related: [
      { label: "How Companies House works", href: "/blog/how-companies-house-works" },
      { label: "Company accounts explained", href: "/blog/company-accounts-explained" },
      { label: "Who owns a company in the UK?", href: "/blog/who-owns-a-company-uk" },
      { label: "Company monitoring", href: "/company-monitoring" },
      { label: "Search the live register", href: "/search" },
    ],
  },

  // ------------------------------------------------------------ Company status meanings
  {
    slug: "company-status-meanings",
    title: "UK Company Status Meanings: Active, Dormant, Dissolved & More",
    excerpt:
      "What each Companies House company status means — active, dormant, dissolved, in liquidation, in administration and proposed strike-off — and what it tells you.",
    meta_description:
      "UK company status meanings explained: active, dormant, dissolved, in liquidation, in administration and strike-off — what each Companies House status tells you.",
    body_md: `A company's status on the Companies House register tells you, at a glance, whether it's a going concern, paused, closing down or already gone. Getting the status right is the first step in any company check — an "active" company is a prospect; a "dissolved" one no longer exists. Here's what the main statuses mean and how to read them.

## Active

The company is registered and has not been dissolved or moved into an insolvency process. **Active** is the normal state for a trading company — but note it doesn't by itself prove the company is trading or healthy; a company can be active yet overdue on its [accounts](/blog/company-accounts-explained). Pair status with the filing history for a fuller picture.

## Dormant

**Dormant** means the company has had no significant accounting transactions in the period and files [dormant accounts](/blog/company-accounts-explained). It's not a warning sign in itself — companies stay dormant to hold a name, protect a brand, or wait for a future plan. A company moving *out* of dormancy can be an interesting signal that it's starting to trade.

## Dissolved

**Dissolved** means the company has been removed from the register and no longer legally exists. It can't trade, and its assets may pass to the Crown. If you're looking at a dissolved company, you're looking at history — useful for background, but not a live prospect. Directors of dissolved companies can, of course, form new ones — see [company director search](/blog/company-director-search-uk).

## In liquidation

**Liquidation** is the process of winding a company up and distributing its assets, usually because it's insolvent (though solvent liquidations also happen). A company in liquidation is closing down; treat it as a risk signal for anything forward-looking.

## In administration

**Administration** is a rescue or protection process run by an appointed administrator, often to try to save the business or get a better result for creditors than immediate liquidation. It signals serious financial distress, but the outcome isn't always closure.

## Proposed to be struck off

This status means a company is on the path to being **struck off** the register — sometimes because it applied to close, sometimes because it failed to file. If it proceeds, the company will be dissolved. An unexpected proposed strike-off on a company you deal with is worth investigating.

## Why status is the first check

Whatever you're doing — [researching a company](/blog/how-to-research-a-uk-company), building a prospect list, or vetting a supplier — status filters the register into "still here and trading" versus "closing or gone." When you [search the live register](/search), you can filter to active companies so your list only contains businesses that still exist. To be told when a company you track changes status — say from active to liquidation — see [company monitoring](/company-monitoring).`,
    faq: [
      { q: "What does 'active' mean on Companies House?", a: "That the company is registered and hasn't been dissolved or placed in an insolvency process. It's the normal state for a trading company, but doesn't by itself prove the company is trading or financially healthy — check its accounts and filing history too." },
      { q: "Does dormant mean a company is closed?", a: "No. Dormant means the company has had no significant accounting transactions in the period and files dormant accounts. Companies stay dormant to hold a name, protect a brand or wait for a plan. A company leaving dormancy can signal it's starting to trade." },
      { q: "What's the difference between dissolved and in liquidation?", a: "A company in liquidation is being wound up but still exists during the process; a dissolved company has been removed from the register and no longer legally exists and can't trade. Liquidation often precedes dissolution." },
      { q: "What does 'proposed to be struck off' mean?", a: "The company is on the path to being removed from the register — either because it applied to close or because it failed to meet filing obligations. If the process completes, the company is dissolved. It's worth investigating on a company you deal with." },
    ],
    related: [
      { label: "How to research a UK company", href: "/blog/how-to-research-a-uk-company" },
      { label: "Company accounts explained", href: "/blog/company-accounts-explained" },
      { label: "Company director search", href: "/blog/company-director-search-uk" },
      { label: "Company monitoring", href: "/company-monitoring" },
      { label: "Search the live register", href: "/search" },
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
  console.log(`Seeding ${ARTICLES.length} education posts as ${status} → ${REST}`);

  // Validate every internal /blog/ link resolves to an already-published slug
  // OR one of the slugs we're about to publish in this batch.
  const existing = await fetchPublishedSlugs();
  const batch = new Set(ARTICLES.map((a) => a.slug));
  const known = new Set([...existing, ...batch]);
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
  console.log(`✓ Upserted ${rows.length} education posts (${status}).`);
}

main().catch((e) => {
  console.error("✗", e);
  process.exit(1);
});
