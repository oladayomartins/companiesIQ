// ============================================================
// Study template: Commercial Opportunity
// ------------------------------------------------------------
// One edition per market per quarter. The question is not "what
// happened on the register?" but "is there a market here for me,
// where is it, and who sells into it?":
//
//   What we found  — exact new-company count for the market, year
//                    on year, split by SIC code
//   Where          — a census of 39 towns and cities for the market,
//                    with the Companies House default address removed
//   How long       — five-year survival for the market's codes against
//                    all companies formed the same year
//   What it means  — who sells into it and when (editorial, from
//                    lib/research/markets.ts — never generated)
//   Build it       — the whole market as a pre-built list
//
// A market's codes are queried together, which Companies House
// treats as "any of" and de-duplicates — so the market total is an
// exact count of companies, not a sum of codes.
// ============================================================
import { CITIES } from "@/lib/cities";
import { CURATED_SIC_CODES } from "@/lib/sic";
import { SITE_URL } from "@/lib/site";
import { marketSearchHref } from "@/lib/market-link";
import { Collector, type CountParams } from "../collect";
import { monthsIn, settledQuarters, yearEarlier } from "../periods";
import { columnChart, fmtDelta, fmtInt, fmtPct, markdownTable, rankedBarChart } from "../charts";
import { MARKETS, type Market } from "../markets";
import type { Issue } from "../validate";
import type { Cell, Dataset, Period, PostDraft, Study } from "../types";

const DEFAULT_ADDRESS_QUERY = "COMPANIES HOUSE DEFAULT ADDRESS";
const DEFAULT_ADDRESS_CITY = "Cardiff";
const TOP_CITIES = 15;
/** Market-level swings are larger than national ones; beyond this, hold for review. */
const MARKET_YOY_BAND = 0.75;
const SURVIVAL_YEARS = 5;

const slugFor = (m: Market) => (period: Period) => `commercial-opportunity-${m.id}-${period.id}`;

function collectFor(m: Market) {
  return async (period: Period): Promise<Dataset> => {
    const c = new Collector();
    const codes = m.codes.map((x) => x.code);
    const comparison = yearEarlier(period);
    const inPeriod = (p: Period): CountParams => ({ sicCodes: codes, incorporatedFrom: p.from, incorporatedTo: p.to });

    const [total, prevTotal, ukTotal] = await Promise.all([
      c.count(`${m.name}, ${period.label}`, inPeriod(period)),
      c.count(`${m.name}, ${comparison.label}`, inPeriod(comparison)),
      c.count(`All incorporations, ${period.label}`, { incorporatedFrom: period.from, incorporatedTo: period.to }),
    ]);

    const months = monthsIn(period);
    const monthly = await c.countMany(months, (mo) => ({
      label: `${m.name}, ${mo.label}`,
      params: { sicCodes: codes, incorporatedFrom: mo.from, incorporatedTo: mo.to },
    }));

    const byCode = await c.countMany(m.codes, (x) => ({ label: `SIC ${x.code}, ${period.label}`, params: { ...inPeriod(period), sicCodes: [x.code] } }));
    const byCodePrev = await c.countMany(m.codes, (x) => ({
      label: `SIC ${x.code}, ${comparison.label}`,
      params: { ...inPeriod(comparison), sicCodes: [x.code] },
    }));
    const codes_: Cell[] = m.codes.map((x, i) => ({
      key: x.code,
      label: x.label,
      value: byCode[i],
      prev: byCodePrev[i],
      change: byCode[i] - byCodePrev[i],
      changePct: byCodePrev[i] ? (byCode[i] - byCodePrev[i]) / byCodePrev[i] : null,
      share: total ? byCode[i] / total : undefined,
      href: CURATED_SIC_CODES.includes(x.code) ? `/sic/${x.code}` : undefined,
    }));

    const cityCounts = await c.countMany(CITIES, (city) => ({
      label: `${m.name} in ${city.name}, ${period.label}`,
      params: { ...inPeriod(period), location: city.name },
    }));
    const defaultAddress = await c.count(`${m.name} at the Companies House default address, ${period.label}`, {
      ...inPeriod(period),
      location: DEFAULT_ADDRESS_QUERY,
    });
    const cities: Cell[] = CITIES.map((city, i) => {
      const raw = cityCounts[i];
      const value = city.name === DEFAULT_ADDRESS_CITY ? Math.max(0, raw - defaultAddress) : raw;
      return { key: city.name, label: city.name, sub: city.region, value, share: total ? value / total : undefined };
    })
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);

    // Survival: the cohort formed SURVIVAL_YEARS full years before the period's year.
    const cohortYear = Number(period.to.slice(0, 4)) - 1 - SURVIVAL_YEARS;
    const cut = `${cohortYear + SURVIVAL_YEARS}-12-31`;
    const cohort = { incorporatedFrom: `${cohortYear}-01-01`, incorporatedTo: `${cohortYear}-12-31` };
    const [mCohort, mDissolved, allCohort, allDissolved] = await Promise.all([
      c.count(`${m.name}, incorporated ${cohortYear}`, { ...cohort, sicCodes: codes }),
      c.count(`${m.name}, incorporated ${cohortYear}, dissolved by ${cut}`, { ...cohort, sicCodes: codes, status: ["dissolved"], dissolvedTo: cut }),
      c.count(`All companies, incorporated ${cohortYear}`, cohort),
      c.count(`All companies, incorporated ${cohortYear}, dissolved by ${cut}`, { ...cohort, status: ["dissolved"], dissolvedTo: cut }),
    ]);

    return {
      study: `opportunity-${m.id}`,
      slug: slugFor(m)(period),
      title: `Commercial opportunity: new ${m.noun} in the UK, ${period.label}`,
      period,
      comparison,
      generatedAt: new Date().toISOString(),
      totals: {
        incorporations: total,
        prevIncorporations: prevTotal,
        changePct: prevTotal ? (total - prevTotal) / prevTotal : 0,
        maxPlausibleYoy: MARKET_YOY_BAND,
        ukIncorporations: ukTotal,
        defaultAddress,
        cohortYear,
        cohortSize: mCohort,
        cohortSurvival: mCohort ? 1 - mDissolved / mCohort : 0,
        allCohortSurvival: allCohort ? 1 - allDissolved / allCohort : 0,
        citiesMeasured: CITIES.length,
      },
      series: [
        { id: "top", label: `${m.name} by town or city, ${period.label}`, unit: "companies incorporated", cells: cities },
        { id: "codes", label: `${m.name} by SIC code, ${period.label}`, unit: "companies incorporated", cells: codes_ },
        { id: "monthly", label: `${m.name} by month, ${period.label}`, unit: "companies incorporated", cells: months.map((mo, i) => ({ key: mo.from, label: mo.label, value: monthly[i] })) },
      ],
      method: [
        {
          heading: "Where the figures come from",
          body: `Every figure is an exact hit count from the Companies House advanced company search API, taken on ${new Date()
            .toISOString()
            .slice(0, 10)}. The market is every company incorporated between ${period.from} and ${period.to} that lists at least one of SIC ${codes.join(", ")}. The codes are queried together, so a company listing more than one is counted once in the market total.`,
        },
        {
          heading: "Places",
          body: `${CITIES.length} UK towns and cities were each counted with one exact query, matching the registered-office address. Companies at the Companies House default address — a Cardiff postcode used when a registered office is removed — were measured (${fmtInt(
            defaultAddress
          )} in this market and period) and subtracted from Cardiff.`,
        },
        {
          heading: "Survival",
          body: `Survival is the share of companies incorporated in ${cohortYear} that had not been dissolved by ${cut}, for this market's codes and for all UK companies. The method matches our company survival study.`,
        },
        {
          heading: "Who sells into the market",
          body: "The buyer table is editorial: written by CompaniesIQ Research from the typical set-up needs of a new company in the market, and reviewed like any other copy. It is not derived from the register and makes no claim about any individual company.",
        },
      ],
      caveats: [
        "SIC codes are chosen by whoever files the incorporation and are not verified, so a market defined by SIC codes includes some companies that do something else and misses some that list a different code.",
        "A registered office is a legal correspondence address, not a place of business, so place counts show where companies are registered rather than where they operate.",
        "These are registrations, not trading businesses: some companies never trade, and counts for recent periods rise slightly as late registrations are processed.",
        "Survival here means not dissolved; a surviving company may be dormant, and most dissolutions are voluntary rather than business failures.",
      ],
      queries: c.ledger,
      source: {
        name: "Companies House register (advanced company search API)",
        url: "https://developer.company-information.service.gov.uk/",
        licence: "Open Government Licence v3.0",
        licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
        retrieved: new Date().toISOString(),
      },
      sampleSize: 0,
    };
  };
}

function check(d: Dataset): Issue[] {
  const issues: Issue[] = [];
  const total = d.totals.incorporations;
  const codes = d.series.find((s) => s.id === "codes")?.cells ?? [];
  const sum = codes.reduce((a, b) => a + b.value, 0);
  // De-duplicated market total: at least the biggest code, at most the sum.
  if (codes.length && (total < Math.max(...codes.map((x) => x.value)) || total > sum)) {
    issues.push({ level: "block", check: "market-total", detail: `Market total ${total} is outside [largest code, sum of codes] = [${Math.max(...codes.map((x) => x.value))}, ${sum}].` });
  }
  if (total > d.totals.ukIncorporations) issues.push({ level: "block", check: "part-exceeds-whole", detail: "Market total exceeds all UK incorporations." });
  if (total < 100) issues.push({ level: "block", check: "market-size", detail: `Only ${total} companies — too few for a market report.` });
  return issues;
}

function renderFor(m: Market) {
  return (d: Dataset): PostDraft => {
    const p = d.period;
    const comp = d.comparison!;
    const cities = d.series.find((s) => s.id === "top")!.cells;
    const codes = d.series.find((s) => s.id === "codes")!.cells;
    const monthly = d.series.find((s) => s.id === "monthly")!.cells;
    const t = d.totals;
    const total = t.incorporations;
    const from = `research:${d.slug}`;
    const csvUrl = `${SITE_URL}/api/research/${d.slug}/data.csv`;
    const codeList = m.codes.map((x) => x.code).join(",");
    const lower = m.noun;
    const buildHref = marketSearchHref({ sic: codeList, name: `New ${lower}`, incorporated: "12m", from });
    const top = cities.slice(0, TOP_CITIES);
    const leader = cities[0];
    const covered = top.reduce((a, b) => a + b.value, 0);
    const dir = t.changePct >= 0 ? "up" : "down";
    const survivalGap = t.cohortSurvival - t.allCohortSurvival;
    const survivalWord = Math.abs(survivalGap) < 0.02 ? "in line with" : survivalGap > 0 ? "above" : "below";

    const codeTable = markdownTable(
      ["SIC code", "Activity", `New companies (${p.label})`, `${comp.label}`, "Change"],
      codes.map((c) => [c.href ? `[${c.key}](${c.href})` : c.key, c.label, fmtInt(c.value), fmtInt(c.prev ?? 0), fmtDelta(c.changePct)])
    );

    const cityTable = markdownTable(
      ["#", "Town or city", "Region", `New ${lower} (${p.label})`, "Share of market", "See the companies"],
      top.map((c, i) => [
        i + 1,
        c.label,
        c.sub ?? "—",
        fmtInt(c.value),
        fmtPct(c.share, 1),
        `[Build the ${c.label} list](${marketSearchHref({ sic: codeList, name: `New ${lower}`, place: c.label, incorporated: "12m", from })})`,
      ])
    );

    const buyerTable = markdownTable(
      ["Who sells into this market", "Why a new company needs it"],
      m.buyers.map((b) => [`**${b.who}**`, b.why])
    );

    const chartCities = rankedBarChart(top, {
      title: `New ${lower} by town or city, ${p.label}`,
      desc: `Horizontal bar chart of new ${lower} registered in ${p.label} in the ${top.length} busiest of ${t.citiesMeasured} measured UK towns and cities. ${leader.label} leads with ${fmtInt(leader.value)}.`,
      source: "Source: Companies House register, registered-office address match. Cardiff corrected for the default address.",
    });

    const chartMonthly = columnChart(monthly.map((x) => ({ label: x.label, value: x.value })), {
      title: `New ${lower} by month, ${p.label}`,
      desc: `Column chart of new ${lower} registered in each month of ${p.label}.`,
      source: "Source: Companies House register.",
      maxValue: Math.ceil(Math.max(...monthly.map((x) => x.value)) / 100) * 100 || undefined,
    });

    const body_md = `**${fmtInt(total)} new ${lower} were registered in the UK in ${p.longLabel}**, ${dir} ${fmtDelta(Math.abs(t.changePct)).replace("+", "")} on ${comp.label}. ${leader.label} had the most, with ${fmtInt(
      leader.value
    )} (${fmtPct(leader.share, 1)} of the market). Each one is a company making its first supplier decisions.

*${m.definition}* This report is part of CompaniesIQ's Commercial Opportunity series: exact Companies House counts for one market, where it is, how long its companies last, and who sells into it. The [full dataset](${csvUrl}) is downloadable.

**[Build this market →](${buildHref})** — every active company in these codes formed in the last 12 months, on the live register.

## What we found

- **${fmtInt(total)} new ${lower}** in ${p.label}, against ${fmtInt(t.prevIncorporations)} in ${comp.label} (${fmtDelta(t.changePct)}).
- **${fmtPct(total / (t.ukIncorporations || 1), 2)} of all ${fmtInt(t.ukIncorporations)} UK incorporations** in the quarter.
- **${leader.label} led** with ${fmtInt(leader.value)}${cities[1] ? `, followed by ${cities[1].label} (${fmtInt(cities[1].value)})` : ""}${cities[2] ? ` and ${cities[2].label} (${fmtInt(cities[2].value)})` : ""}.
- **${fmtPct(t.cohortSurvival, 1)} of ${lower} formed in ${t.cohortYear} had not been dissolved five years later**, ${survivalWord} the ${fmtPct(t.allCohortSurvival, 1)} for all UK companies formed that year.

${codeTable}

A company can list up to four SIC codes, so the code rows overlap and add up to more than the market total of ${fmtInt(total)}, which counts each company once.

${chartMonthly}

## Where new ${lower} are registering

${chartCities}

${cityTable}

The ${top.length} places above account for ${fmtPct(covered / (total || 1), 1)} of the market. A registered office is a legal correspondence address, not a place of business, so place counts show where companies are registered rather than where they operate — accountants' and formation agents' addresses pull registrations towards city centres, London especially.${
      t.defaultAddress
        ? ` ${fmtInt(t.defaultAddress)} companies in this market were registered at the Companies House default address in Cardiff (used when a registered office is removed) and are excluded from Cardiff's figure.`
        : ""
    }

## How long they last

Of the ${fmtInt(t.cohortSize)} ${lower} incorporated in ${t.cohortYear}, **${fmtPct(t.cohortSurvival, 1)} had not been dissolved by the end of ${t.cohortYear + SURVIVAL_YEARS}** — ${survivalWord} the ${fmtPct(
      t.allCohortSurvival,
      1
    )} for every UK company formed that year. Survival here means not dissolved; a surviving company may be dormant, and most dissolutions are voluntary rather than business failures. The full picture by cohort is in our [company survival study](/blog/uk-company-survival-rates-h1-2026).

## What this means: who sells to new ${lower}

${buyerTable}

${m.timing} That is the case for reaching new ${lower} early — and for working from the live register rather than a list that was current months ago.

**[Build this market →](${buildHref})** opens every active company in these codes formed in the last 12 months. Narrow it to a town from the table above, or get new registrations weekly with [free new-company alerts](/free-alerts).

## <a id="methodology"></a>Methodology

${d.method.map((x) => `**${x.heading}.** ${x.body}`).join("\n\n")}

**Limitations.**

${d.caveats.map((x) => `- ${x}`).join("\n")}

## Data and licence

- **Period covered:** ${p.from} to ${p.to} (inclusive), compared with ${comp.from} to ${comp.to}.
- **Source:** ${d.source.name}.
- **Retrieved:** ${d.source.retrieved.slice(0, 10)}.
- **Licence:** Contains public sector information licensed under the [${d.source.licence}](${d.source.licenceUrl}). Company data © Crown copyright.
- **Download:** [${d.slug}.csv](${csvUrl}) — every figure and the query behind it.

**Citation.** CompaniesIQ Research (${new Date(d.generatedAt).getFullYear()}). *${d.title}*. Available at: ${SITE_URL}/blog/${d.slug}`;

    return {
      slug: d.slug,
      title: d.title,
      excerpt: `${fmtInt(total)} new ${lower} registered in the UK in ${p.label} (${fmtDelta(t.changePct)} year on year). Where they are, how long they last, who sells to them — and the live list.`,
      meta_description: `${fmtInt(total)} new UK ${lower} in ${p.label}, ${fmtDelta(t.changePct)} YoY. Exact Companies House counts by city, survival rates, and who sells to them.`.slice(0, 155),
      body_md,
      faq: [
        {
          q: `How many new ${lower} were registered in the UK in ${p.label}?`,
          a: `${fmtInt(total)} companies listing SIC ${m.codes.map((x) => x.code).join(", ")} were incorporated between ${p.from} and ${p.to}, against ${fmtInt(t.prevIncorporations)} in ${comp.label} (exact Companies House counts).`,
        },
        {
          q: `Where are new ${lower} registering?`,
          a: `${leader.label} had the most in ${p.label}, with ${fmtInt(leader.value)} (${fmtPct(leader.share, 1)} of the market). Counts are by registered-office address, which is not always where a company operates.`,
        },
        {
          q: `How long do new ${lower} last?`,
          a: `${fmtPct(t.cohortSurvival, 1)} of those incorporated in ${t.cohortYear} had not been dissolved five full years later, against ${fmtPct(t.allCohortSurvival, 1)} for all UK companies formed that year.`,
        },
        {
          q: `How do I find new ${lower} to sell to?`,
          a: "CompaniesIQ reads the Companies House register live. The 'Build this market' link in this report opens every active company in these SIC codes formed in the last 12 months, filterable by town.",
        },
      ],
      related: [
        { label: "UK company survival rates", href: "/blog/uk-company-survival-rates-h1-2026" },
        { label: "SIC code directory", href: "/sic" },
        { label: "Free new-company alerts", href: "/free-alerts" },
        { label: "Our data sources", href: "/sources" },
      ],
    };
  };
}

export const OPPORTUNITY_STUDIES: Study[] = MARKETS.map((m) => ({
  id: `opportunity-${m.id}`,
  question: `How many new ${m.noun} were registered, where, how long do they last, and who sells to them?`,
  cadence: "quarter",
  periods: (now) => settledQuarters(now, 1),
  slugFor: slugFor(m),
  collect: collectFor(m),
  render: renderFor(m),
  check,
}));
