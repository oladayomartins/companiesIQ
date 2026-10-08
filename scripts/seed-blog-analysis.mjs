// Round-4 blog content — the analytical layer. Rounds 1-3 were commercial and
// educational; these interpret CompaniesIQ's own measured register data: what
// formation and survival figures mean, what they don't, and what a reader can
// do with them. Each one ends in a pre-built list (lib/market-link), so the
// article is the first step of using the product, not the end of the visit.
//
// Accuracy rules (stricter than earlier rounds, because these make claims):
//   · every figure is an exact Companies House count from a CompaniesIQ
//     research edition or a query re-run on the date stated in the article;
//   · causes are never asserted from register data alone — where we offer an
//     explanation we say it is one, and say what would test it;
//   · the standing caveats (registered office ≠ place of business, dissolved ≠
//     failed, SIC codes overlap) appear wherever the claim depends on them.
//
// Sources for the figures below:
//   · uk-company-survival-rates-h1-2026 (company-survival study, retrieved 2026-10-08)
//   · top-sic-codes-uk-company-registrations-h1-2026 (sic-formations study, regenerated 2026-10-08)
//   · London/UK annual and quarterly counts re-run 2026-10-08 (location=London,
//     incorporated_from/to, advanced company search)
//
// These link to the research editions, so publish those first. --draft stages
// everything as drafts and accepts links to unpublished editions.
//
// Usage:  node scripts/seed-blog-analysis.mjs            # publish/refresh
//         node scripts/seed-blog-analysis.mjs --draft    # insert as drafts
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

const SURVIVAL = "/blog/uk-company-survival-rates-h1-2026";
const SIC_H1 = "/blog/top-sic-codes-uk-company-registrations-h1-2026";
const CITY_Q2 = "/blog/where-uk-companies-register-q2-2026";

const ARTICLES = [
  // ------------------------------------------------------------ Business strategy: what the data means
  {
    slug: "what-company-formation-data-tells-us-about-the-uk-economy",
    title: "What company formation data can — and can't — tell you about the UK economy",
    excerpt:
      "New company registrations are fast, exact and free to read. They are also easy to over-read. What the Companies House register reliably shows, where it misleads, and how to use it well.",
    meta_description:
      "What UK company formation data reliably shows — sector momentum, new demand, local activity — and where it misleads. With exact Companies House figures.",
    body_md: `Company formation data is one of the few economic signals that is exact, free and published daily. **It reliably tells you where new commercial activity is being set up — by sector, by place and over time. It does not tell you how many businesses are trading, how much they earn or how many people they employ.** Most bad readings of the data come from treating the first kind of fact as the second.

This guide sets out what the Companies House register can support, using figures from our own research editions, and the four traps that catch most people who quote it.

## What the register measures

Every UK limited company, LLP and PLC is created by registration at Companies House. The register records the date, the registered office, up to four SIC codes describing the intended activity, and later the company's status — including when it is dissolved. Because registration is a legal requirement, the count is a census, not a survey: nobody is sampled, and the figure for a period is exact.

Our [H1 2026 edition](${SIC_H1}) measured **400,176 incorporations in the first half of 2026, down 5.9% on the 425,088 in the first half of 2025.** That is a precise statement about company registrations. Whether it is a statement about the economy is the question this article is about.

## What formation data is good for

### 1. Sector momentum

Changes in what people register are a fast read on where founders think the opportunity is. In H1 2026 the clearest movement was in software:

- **Software development (SIC 62012):** 20,765 registrations, up 71.4% year on year.
- **Data processing and hosting (SIC 63110):** 3,810, up 56.4%.

Over the same period **buying and selling own real estate (SIC 68100) fell 14.0%** and online retail (47910) fell 7.1%, although online retail remained the single most-registered activity. Those are large, simultaneous movements in opposite directions — the kind of shift that shows up in the register months before it appears in output statistics.

What the register cannot tell you is *why*. A surge in software registrations is consistent with a wave of AI-related start-ups, with contractors re-describing their activity, or with formation agents changing the default codes they file. The register alone doesn't separate those. What it does tell you, unambiguously, is that a lot more companies are now *declaring* software as their business — which is exactly what a supplier selling to software companies needs to know.

### 2. New demand

Every new company is a buyer before it is anything else. In its first months it opens a bank account, appoints an accountant, buys insurance, registers a domain and often builds a website. Formation counts are therefore a direct measure of fresh demand for those services — by sector and by place. This is the most practical use of the data and the least controversial, because it doesn't depend on any of the companies succeeding.

### 3. Where activity is being registered

Formation counts by place show where companies choose to register, and how that is changing. London took **27.9% of UK registrations in Q2 2026**, up from 24.2% in Q2 2025 (counts re-run on 8 October 2026). That rise is real in the register — but read the next section before treating it as a fact about London's economy. We look at it in detail in [London's growing share of new UK companies](/blog/london-share-of-new-uk-companies).

## Four ways formation data misleads

### A registration is not a trading business

A company can be registered and never trade. Property-holding vehicles, holding companies, dormant companies kept to protect a name, and companies formed for a single contract all count as incorporations. Some SIC codes — holding companies (64209) and property letting (68209) especially — reflect *structuring* as much as new economic activity. Formation counts measure intent and legal set-up, not activity.

### A registered office is not where the business operates

The location on the register is the registered office: a legal address for correspondence. Many companies use their accountant's or a formation agent's address, which concentrates registrations in city centres and in London above all. A city's formation count is *where companies are registered*, which is only a proxy for where they work.

### SIC codes overlap and are self-declared

A company can list up to four SIC codes, so code counts double-count and shares don't sum to 100%. The codes are chosen by the person filing, aren't verified, and are rarely updated as a business changes. Use them for direction and scale, not as an industry census.

### Dissolution is not failure

When companies leave the register, the cause is usually voluntary strike-off by their own directors, not insolvency. Our [company survival study](${SURVIVAL}) found that of companies formed in 2016, 71.6% have since been dissolved — but fewer than 1% of that cohort is currently in liquidation. Treating dissolution counts as business failure rates overstates failure by a very wide margin.

## Register artefacts to watch for

The register also contains administrative events that look like economic ones:

- **The Companies House default address.** When a registered office is disputed or removed, Companies House moves the company to its own default address, which is a Cardiff postcode. In Q2 2025 this put 8,196 companies into Cardiff's raw count. Uncorrected, Cardiff's formation figures show a collapse that never happened. Our [city edition](${CITY_Q2}) measures and removes them.
- **The 2020 strike-off pause.** Companies House paused striking companies off the register during the pandemic. Companies formed in 2019 therefore show an unusually low first-year dissolution rate (9.0%, against 16–26% for every other cohort we measured) — a timing effect, not a healthier generation of companies.
- **Late registrations.** Counts for a recent period creep up for a few weeks as late filings are processed. Our H1 2026 total read 400,150 in early September and 400,176 a month later. We hold every period back three weeks before reporting it for this reason.

## How to use the data well

1. **Compare like with like.** Same period length, same filter, same retrieval method. Year-on-year comparisons of the same quarter remove most seasonality.
2. **Use exact counts, not samples.** Companies House advanced search returns an exact hit count for a filter. A figure from a sampled list is an estimate and should be labelled as one.
3. **Separate the signal you need from the one you don't.** For finding new customers, a registration is the event that matters, whether or not the company succeeds. For judging economic health, combine formation data with survival, employment and output data.
4. **State your caveats next to your number.** The figure travels further than the footnote.

## From pattern to prospects

The point of reading formation data is usually to act on it. If software development registrations are up 71.4%, the useful next step is the list of companies behind that number. You can open [software development companies formed in the last 12 months](/search?sic=62012&inc=12m&from=blog%3Aformation-data-uk-economy) on the live register, or browse every [SIC code we track](/sic). [Free new-company alerts](/free-alerts) send new registrations in a sector or place each week.

*Figures are exact Companies House counts from CompaniesIQ research editions and queries re-run on the dates stated, under the Open Government Licence v3.0. See our [data sources](/sources).*`,
    faq: [
      { q: "Is the number of new companies a good measure of the UK economy?", a: "It is a good, fast measure of new business set-up and of where founders see opportunity, by sector and place. It is not a measure of trading activity, turnover or employment: many registered companies never trade, and registration addresses don't always reflect where businesses operate." },
      { q: "How many companies were incorporated in the UK in the first half of 2026?", a: "400,176 according to our H1 2026 research edition (exact Companies House count, retrieved October 2026), down 5.9% on 425,088 in H1 2025. Counts for recent periods rise slightly for a few weeks as late registrations are processed." },
      { q: "Does a dissolved company mean the business failed?", a: "Usually not. Most dissolutions are voluntary strike-offs by the company's own directors. In our survival study, fewer than 1% of the 2016 cohort is in liquidation, while 71.6% has been dissolved." },
      { q: "Why do SIC code counts add up to more than the total?", a: "A company can list up to four SIC codes, so it is counted under each code it lists. Shares by SIC code are shares of companies, not slices of a whole, and don't sum to 100%." },
    ],
    related: [
      { label: "UK company survival rates", href: SURVIVAL },
      { label: "Top SIC codes, H1 2026", href: SIC_H1 },
      { label: "SIC codes explained", href: "/blog/sic-codes-explained" },
      { label: "Company status meanings", href: "/blog/company-status-meanings" },
      { label: "Our data sources", href: "/sources" },
    ],
  },

  // ------------------------------------------------------------ Lead intelligence: why lists go stale
  {
    slug: "why-b2b-prospect-lists-go-stale",
    title: "Why B2B prospect lists go stale: what ten years of Companies House data shows",
    excerpt:
      "More than half of the companies formed in 2022 have already been dissolved. Exact register data on how fast company lists decay — and what that means for how you build and refresh one.",
    meta_description:
      "Over half of UK companies formed in 2022 are already dissolved. Exact Companies House data on how fast prospect lists decay, and how to keep yours current.",
    body_md: `**A list of UK companies starts decaying the day it is built.** Of the companies incorporated in 2022, 60.1% have already been dissolved; of those formed in 2023, 55.2%. Even the newest cohort thins quickly: 26.3% of companies formed in 2024 were dissolved by the end of 2025. Any prospect list that isn't checked against the live register is, within a year or two, substantially a list of companies that no longer exist.

These figures come from our [company survival study](${SURVIVAL}), which follows every UK incorporation from 2016 to 2025 — 7,573,361 companies — using exact Companies House counts retrieved on 8 October 2026.

## How fast company lists decay

The table shows the share of each year's new companies dissolved by the end of the first, second and third calendar year after incorporation.

| Companies formed in | Dissolved by end of year 1 | By end of year 2 | By end of year 3 |
| --- | --- | --- | --- |
| 2016 | 17.6% | 40.0% | 49.4% |
| 2018 | 17.8% | 34.6% | 44.7% |
| 2020 | 17.7% | 40.8% | 50.2% |
| 2022 | 22.4% | 46.2% | 54.7% |
| 2023 | 23.1% | 48.2% | — |
| 2024 | 26.3% | — | — |

Two things stand out. First, **between 42% and 55% of every cohort is gone within three calendar years.** Second, **the decay is getting faster**: the share dissolved by the end of the first year rose from 17.6% for companies formed in 2016 to 26.3% for those formed in 2024, and the two-year figure from 40.0% to 48.2% (2023 cohort).

Ages here are by calendar year, so "year 1" means up to 31 December of the year after incorporation — between 12 and 24 months of life. The full curve, every cohort and the method are in the [study](${SURVIVAL}).

## Dissolved doesn't mean failed — but it does mean gone

Most dissolved companies weren't insolvent. They were struck off by their own directors because the project ended, the contractor took a job, or the vehicle was no longer needed. For a seller that distinction doesn't help: whatever the reason, a dissolved company cannot buy from you, and an email to its old address is wasted at best and a deliverability problem at worst.

## Decay varies a lot by line of business

Following the 2020 cohort for five full years, the share of companies *not* dissolved varied more than twofold by SIC code:

| Line of business | SIC | Not dissolved after 5 years |
| --- | --- | --- |
| Letting of own or leased property | 68209 | 68.3% |
| Buying and selling own real estate | 68100 | 62.8% |
| Management consultancy | 70229 | 47.5% |
| IT consultancy | 62020 | 39.6% |
| Specialised construction | 43999 | 37.9% |
| Freight transport by road | 49410 | 26.9% |
| Retail via mail order or internet | 47910 | 26.5% |

A list of new online retailers decays roughly twice as fast as a list of new property-letting companies. (Companies can list up to four SIC codes, so these groups overlap.)

## What this means for how you prospect

**1. Build lists from the live register, not from a file.** A purchased or exported list is a snapshot. Given the rates above, a list built from 2023 incorporations is now majority-dissolved. Status should be checked at the moment of outreach, not the moment of purchase.

**2. Reach new companies early.** The months after incorporation are when a company makes most of its first supplier decisions — bank, accountant, insurer, website, software. They are also the months before attrition thins the cohort. Speed matters more than list size.

**3. Match your cadence to your market's decay rate.** If you sell into high-churn sectors like online retail or haulage, work lists in weeks, not quarters. In lower-churn sectors such as property letting, account-based approaches have time to pay off.

**4. Watch the companies you care about.** A status change — to *proposed strike-off*, *in liquidation* or *dissolved* — is the moment to remove a company from a sequence or check on a customer. [Company monitoring](/company-monitoring) flags these changes automatically. See [company status meanings](/blog/company-status-meanings) for what each status signals.

## Build a list that is current today

CompaniesIQ reads the register live, so every list reflects company status at the moment you open it. Start with [active companies formed in the last 12 months](/search?sector=Professional+services&inc=12m&from=blog%3Astale-lists) in a sector you sell to, or pick a code from the [SIC directory](/sic). Sales teams can see the full workflow in [CompaniesIQ for sales teams](/use-cases/sales-teams), and [free new-company alerts](/free-alerts) deliver new registrations every week.

*Figures: exact Companies House counts from the CompaniesIQ company survival study, retrieved 8 October 2026, under the Open Government Licence v3.0.*`,
    faq: [
      { q: "How quickly do UK company lists go out of date?", a: "Quickly. Of UK companies formed in 2022, 60.1% had been dissolved by October 2026; of those formed in 2024, 26.3% were dissolved by the end of 2025. Between 42% and 55% of each annual cohort is dissolved within three calendar years." },
      { q: "Are new UK companies being dissolved faster than before?", a: "Yes. The share dissolved by the end of the year after incorporation rose from 17.6% for companies formed in 2016 to 26.3% for companies formed in 2024 (exact Companies House counts)." },
      { q: "Which kinds of company last longest?", a: "Among twelve common SIC codes followed for five years from 2020, property letting (68209) had the highest share not dissolved, at 68.3%, and online retail (47910) the lowest, at 26.5%." },
      { q: "How do I keep a prospect list up to date?", a: "Build it from the live Companies House register rather than a static file, filter to active companies, check status before outreach, and monitor the companies you are working so you see status changes such as proposed strike-off or liquidation." },
    ],
    related: [
      { label: "UK company survival rates", href: SURVIVAL },
      { label: "Company monitoring", href: "/company-monitoring" },
      { label: "Newly incorporated companies", href: "/blog/newly-incorporated-companies-uk" },
      { label: "CompaniesIQ for sales teams", href: "/use-cases/sales-teams" },
      { label: "Free new-company alerts", href: "/free-alerts" },
    ],
  },

  // ------------------------------------------------------------ Market intelligence: London's share
  {
    slug: "london-share-of-new-uk-companies",
    title: "London's growing share of new UK companies — and what's really behind it",
    excerpt:
      "London's share of UK company registrations has risen from 22.5% in 2016 to 27.2% in the first half of 2026. Exact Companies House figures, and why part of the rise is about addresses, not economics.",
    meta_description:
      "London's share of new UK company registrations rose from 22.5% (2016) to 27.2% (H1 2026). Exact Companies House figures, and what's driving the rise.",
    body_md: `**London is taking a growing share of new UK companies.** In 2016, 22.5% of companies incorporated in the UK had a London registered office; in 2025 it was 25.0%, and in the first half of 2026 it reached **27.2%**. In Q2 2026 London registrations rose 5.5% year on year while the UK total fell 8.5%.

Those are exact Companies House counts, re-run on 8 October 2026. What they mean is less obvious than it looks, because a registered office is an address, not a place of business.

## The numbers

| Year | UK incorporations | London registered office | London share |
| --- | --- | --- | --- |
| 2016 | 665,457 | 149,650 | 22.5% |
| 2017 | 634,863 | 144,785 | 22.8% |
| 2018 | 666,814 | 153,251 | 23.0% |
| 2019 | 687,219 | 156,355 | 22.8% |
| 2020 | 776,944 | 191,421 | 24.6% |
| 2021 | 768,798 | 196,674 | 25.6% |
| 2022 | 802,467 | 199,225 | 24.8% |
| 2023 | 896,572 | 222,313 | 24.8% |
| 2024 | 844,294 | 199,753 | 23.7% |
| 2025 | 829,933 | 207,399 | 25.0% |
| H1 2026 | 400,176 | 108,855 | 27.2% |

And the most recent quarter against the same quarter a year earlier:

| Quarter | UK incorporations | London | London share |
| --- | --- | --- | --- |
| Q2 2025 | 211,816 | 51,254 | 24.2% |
| Q2 2026 | 193,829 | 54,077 | 27.9% |

The shape is a step up in 2020–21, a dip in 2024, and a sharp rise since. The first half of 2026 is the highest London share in the series by a clear margin — 1.6 points above the previous peak in 2021.

## Three readings — and what would tell them apart

The register records *that* London's share rose, not *why*. There are three plausible explanations, and they are not mutually exclusive.

**1. More business is genuinely being started in London.** London's sector mix leans towards professional services, software and finance — the codes that grew in our [H1 2026 SIC edition](${SIC_H1}), where software development registrations rose 71.4% and management consultancy 15.1%. Sectors that grew nationally and are London-heavy would lift London's share. *Test:* if this is the driver, London's share should be rising within individual SIC codes less than overall.

**2. More companies are registered at London service addresses.** Formation agents, accountants and virtual-office providers register very large numbers of companies at a small number of central London addresses. If a growing share of founders — including founders based elsewhere in the UK or overseas — use these services, London's count rises without any change in where businesses operate. *Test:* concentration of registrations at the busiest London addresses should be rising.

**3. Fewer registrations elsewhere.** London's share can rise because other places fall. In Q2 2026, every one of the ten busiest locations outside London fell year on year except Edinburgh, according to our [city edition](${CITY_Q2}). Some of London's share gain is simply the rest of the UK registering fewer companies.

The 2020–21 step up coincides with the surge in incorporations during the pandemic — 2020 was then the busiest year in the series — much of it online, where a London service address is the default option for a founder anywhere. That is consistent with the second reading, but the register alone cannot prove it.

## Caveats that matter here

- **A registered office is not a place of business.** It is a legal correspondence address, and services that provide one are concentrated in central London.
- **The location filter is a text match.** Companies House has no city field; we count companies whose registered office address contains "London". That can include a "London Road" in another town, and excludes London companies whose address names only a borough.
- **Addresses change.** The filter matches each company's *current* registered office (or its last one, if dissolved), not the address it was formed with. Counts for older years drift slightly as companies move; this is why every figure here was re-run on the same day.

## What it means if you sell to new businesses

Whatever the cause, London is where the largest volume of new companies appears on the register — more than 54,000 in a single quarter. For suppliers to new businesses, that makes it the deepest single market to work. The caveat cuts the other way, too: a company with a London service address may be run from Leeds or from Lagos, so check the directors' and trading details before assuming a London territory.

Open [London companies formed in the last 12 months](/search?place=London&inc=12m&from=blog%3Alondon-share) on the live register, or compare other places on our [city pages](/city). For regional territory planning, the full Q2 2026 ranking of 39 towns and cities is in our [city edition](${CITY_Q2}).

*Figures: exact Companies House counts (advanced company search, location "London", by incorporation date) re-run on 8 October 2026, under the Open Government Licence v3.0. See our [data sources](/sources).*`,
    faq: [
      { q: "What share of new UK companies are registered in London?", a: "27.2% in the first half of 2026, and 27.9% in Q2 2026 — up from 22.5% for the whole of 2016. These are exact Companies House counts of companies with a London registered office, re-run on 8 October 2026." },
      { q: "Is London's growing share a sign that London's economy is outperforming?", a: "Not necessarily. A registered office is a legal address, and formation agents and virtual-office providers register many companies at central London addresses regardless of where the business operates. Falling registrations elsewhere also lift London's share. The register shows the rise but not its cause." },
      { q: "How many companies were registered in London in Q2 2026?", a: "54,077, against 51,254 in Q2 2025 — a 5.5% rise while UK-wide registrations fell 8.5% to 193,829 (counts re-run on 8 October 2026)." },
    ],
    related: [
      { label: "Where UK companies register, Q2 2026", href: CITY_Q2 },
      { label: "Companies in London", href: "/city/london" },
      { label: "London market overview", href: "/market/london" },
      { label: "Our data sources", href: "/sources" },
    ],
  },
];

async function fetchSlugs(filter) {
  const res = await fetch(`${REST}?select=slug${filter}`, { headers });
  if (!res.ok) return new Set();
  const rows = await res.json();
  return new Set(rows.map((r) => r.slug));
}

async function main() {
  const status = DRAFT ? "draft" : "published";
  console.log(`Seeding ${ARTICLES.length} analysis posts as ${status} → ${REST}`);

  // Every internal /blog/ link must resolve. Published articles may only link
  // to published posts; drafts may also point at editions still in review.
  const known = new Set([...(await fetchSlugs(DRAFT ? "" : "&status=eq.published")), ...ARTICLES.map((a) => a.slug)]);
  let warnings = 0;
  for (const a of ARTICLES) {
    const bodyRefs = [...a.body_md.matchAll(/\]\(\/blog\/([a-z0-9-]+)\)/g)].map((m) => m[1]);
    const relRefs = (a.related || []).map((r) => r.href).filter((h) => h.startsWith("/blog/")).map((h) => h.slice(6));
    for (const ref of [...bodyRefs, ...relRefs]) {
      if (!known.has(ref)) {
        console.warn(`  ! ${a.slug}: links to ${DRAFT ? "unknown" : "unpublished"} blog slug /blog/${ref}`);
        warnings++;
      }
    }
    if (a.meta_description.length > 155) {
      console.warn(`  ! ${a.slug}: meta description is ${a.meta_description.length} chars (max 155)`);
      warnings++;
    }
  }
  if (warnings) {
    console.error(`✗ ${warnings} problem(s) — aborting.${DRAFT ? "" : " Publish the research editions first, or run with --draft."}`);
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
  console.log(`✓ Upserted ${rows.length} analysis posts (${status}).`);
}

main().catch((e) => {
  console.error("✗", e);
  process.exit(1);
});
