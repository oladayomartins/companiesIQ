// ============================================================
// Study: where new UK companies register
// ------------------------------------------------------------
// Question: which towns and cities took the most new company
// registrations in a quarter, and how did that change year on year?
//
// Measurement design. Companies House has no "city" field: the
// filter available is a free-text match on the registered-office
// address. Each city is therefore counted with one exact query per
// period, over a fixed list of 39 UK towns and cities — a census of
// a defined list, not a ranking of every settlement in the UK. That
// distinction, and the fact that a registered office is an address
// rather than a place of business, are stated in every edition.
// ============================================================
import { CITIES } from "@/lib/cities";
import { slugify } from "@/lib/slug";
import { SITE_URL } from "@/lib/site";
import { Collector } from "../collect";
import { monthsIn, settledQuarters } from "../periods";
import { columnChart, divergingChart, fmtDelta, fmtInt, fmtPct, markdownTable, rankedBarChart, yearOnYearChart } from "../charts";
import { markAnomalies } from "../validate";
import type { Cell, Dataset, Period, PostDraft, Study } from "../types";
import { marketSearchHref } from "@/lib/market-link";

const TOP_N = 20;
const MOVER_FLOOR = 300;

/**
 * Companies House relocates a company's registered office to its own default
 * address — a Cardiff postcode — when an address is disputed, unlawfully used
 * or struck out under the Economic Crime and Corporate Transparency Act. Those
 * companies are not Cardiff businesses, and there have been enough of them to
 * dominate Cardiff's count: in Q2 2025 they outnumbered genuine Cardiff
 * registrations by more than ten to one. Left uncorrected, the series reports a
 * collapse in Cardiff business formation that never happened. So we measure the
 * default address directly and subtract it, and say so in the report.
 */
const DEFAULT_ADDRESS_QUERY = "COMPANIES HOUSE DEFAULT ADDRESS";
const DEFAULT_ADDRESS_CITY = "Cardiff";

function slugFor(period: Period): string {
  return `where-uk-companies-register-${period.id}`;
}

async function collect(period: Period, comparison: Period | null): Promise<Dataset> {
  const c = new Collector();
  const months = monthsIn(period);

  const [total, prevTotal] = await Promise.all([
    c.count(`All incorporations, ${period.label}`, { incorporatedFrom: period.from, incorporatedTo: period.to }),
    comparison
      ? c.count(`All incorporations, ${comparison.label}`, { incorporatedFrom: comparison.from, incorporatedTo: comparison.to })
      : Promise.resolve(0),
  ]);

  const monthly = await c.countMany(months, (m) => ({
    label: `Incorporations, ${m.label}`,
    params: { incorporatedFrom: m.from, incorporatedTo: m.to },
  }));

  const counts = await c.countMany(CITIES, (city) => ({
    label: `${city.name} incorporations, ${period.label}`,
    params: { location: city.name, incorporatedFrom: period.from, incorporatedTo: period.to },
  }));

  // Measure the Companies House default address so it can be removed from the
  // city it sits in (see DEFAULT_ADDRESS_QUERY).
  const defaultAddressNow = await c.count(`Companies House default address, ${period.label}`, {
    location: DEFAULT_ADDRESS_QUERY,
    incorporatedFrom: period.from,
    incorporatedTo: period.to,
  });

  const ranked: Cell[] = CITIES.map((city, i) => {
    const raw = counts[i];
    const isDefaultCity = city.name === DEFAULT_ADDRESS_CITY;
    const value = isDefaultCity ? Math.max(0, raw - defaultAddressNow) : raw;
    return {
      key: slugify(city.name),
      label: city.name,
      sub: city.region,
      value,
      share: total ? value / total : undefined,
      href: `/city/${slugify(city.name)}`,
      ...(isDefaultCity ? { extra: { raw, defaultAddress: defaultAddressNow } } : {}),
    };
  })
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  let defaultAddressPrev = 0;
  if (comparison) {
    defaultAddressPrev = await c.count(`Companies House default address, ${comparison.label}`, {
      location: DEFAULT_ADDRESS_QUERY,
      incorporatedFrom: comparison.from,
      incorporatedTo: comparison.to,
    });
    const prevCounts = await c.countMany(ranked, (cell) => ({
      label: `${cell.label} incorporations, ${comparison.label}`,
      params: { location: cell.label, incorporatedFrom: comparison.from, incorporatedTo: comparison.to },
    }));
    ranked.forEach((cell, i) => {
      // The comparison period needs the same correction, or the adjustment
      // itself would read as a year-on-year change.
      const prev = cell.label === DEFAULT_ADDRESS_CITY ? Math.max(0, prevCounts[i] - defaultAddressPrev) : prevCounts[i];
      cell.prev = prev;
      cell.change = cell.value - prev;
      cell.changePct = prev > 0 ? (cell.value - prev) / prev : null;
      if (cell.extra) cell.extra.defaultAddressPrev = defaultAddressPrev;
    });
  }

  markAnomalies(ranked);

  const movers = ranked
    .filter((x) => x.changePct !== null && x.changePct !== undefined && x.value >= MOVER_FLOOR)
    .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));

  return {
    study: "city-formations",
    slug: slugFor(period),
    title: `Where new UK companies registered in ${period.label}: the top towns and cities`,
    period,
    comparison,
    generatedAt: new Date().toISOString(),
    totals: {
      incorporations: total,
      prevIncorporations: prevTotal,
      changePct: prevTotal ? (total - prevTotal) / prevTotal : 0,
      citiesMeasured: CITIES.length,
      defaultAddress: defaultAddressNow,
      defaultAddressPrev,
      cardiffRaw: counts[CITIES.findIndex((x) => x.name === DEFAULT_ADDRESS_CITY)] ?? 0,
    },
    series: [
      { id: "top", label: `Registrations by town or city, ${period.label}`, unit: "companies incorporated", cells: ranked.slice(0, TOP_N) },
      { id: "movers", label: `Year-on-year change, ${period.label} vs ${comparison?.label ?? "n/a"}`, unit: "% change", cells: movers },
      {
        id: "monthly",
        label: `Incorporations by month, ${period.label}`,
        unit: "companies incorporated",
        cells: months.map((m, i) => ({ key: m.from, label: m.label, value: monthly[i] })),
      },
    ],
    method: [
      {
        heading: "Where the figures come from",
        body: `Each city figure is an exact hit count from the Companies House advanced company search API, filtered on registered-office location and incorporation date, taken on ${new Date()
          .toISOString()
          .slice(0, 10)} for companies incorporated between ${period.from} and ${period.to} inclusive.`,
      },
      {
        heading: "Which places are measured",
        body: `${CITIES.length} UK towns and cities were counted, each with its own exact query. This is a census of a defined list rather than a ranking of every settlement in the UK: a town outside the list cannot appear, however fast it is growing.`,
      },
      {
        heading: "The Companies House default address",
        body: `Companies House moves a company's registered office to its own default address — a Cardiff postcode — when the original address is disputed, used without permission or removed under the Economic Crime and Corporate Transparency Act. Those companies are not Cardiff businesses, and there are enough of them to dominate the city's raw count. This study measures the default address directly and subtracts it from Cardiff: ${fmtInt(
          defaultAddressNow
        )} companies in ${period.label}${comparison ? `, against ${fmtInt(defaultAddressPrev)} in ${comparison.label}` : ""}. Cardiff figures here are the corrected ones.`,
      },
      {
        heading: "What a location match means",
        body: "Companies House has no city field. The location filter matches the registered-office address text, so a count includes addresses that contain the place name and excludes surrounding areas that do not. Neighbouring boroughs and postal towns are not aggregated into their nearest city.",
      },
    ],
    caveats: [
      "Cardiff counts are corrected for the Companies House default address, which is a Cardiff postcode used for companies whose registered office has been removed. Uncorrected Cardiff figures overstate the city, and their year-on-year movement is meaningless.",
      "A registered office is a legal correspondence address, not a place of business. Companies frequently register at an accountant's or formation agent's address, which concentrates registrations in city centres and in London in particular.",
      "Place counts come from a free-text address match, so they cannot be treated as local-authority statistics.",
      "These are registrations, not trading businesses, and counts move slightly as late registrations are processed.",
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
}

function render(d: Dataset): PostDraft {
  const p = d.period;
  const comp = d.comparison;
  const top = d.series.find((s) => s.id === "top")!.cells;
  const movers = d.series.find((s) => s.id === "movers")!.cells;
  const monthly = d.series.find((s) => s.id === "monthly")!.cells;
  const total = d.totals.incorporations;
  const prev = d.totals.prevIncorporations;
  const totalDelta = d.totals.changePct;
  const dir = totalDelta >= 0 ? "up" : "down";
  const leader = top[0];
  const second = top[1];
  // Anomalous rows stay in the tables but never become a headline claim.
  const risers = movers.filter((m) => (m.changePct ?? 0) > 0 && !m.anomaly).slice(0, 6);
  const fallers = movers.filter((m) => (m.changePct ?? 0) < 0 && !m.anomaly).slice(-6).reverse();
  // Flagged rows are drawn from the whole measured field, not just the rows
  // large enough to chart — a correction is worth stating wherever it applies.
  const flagged = movers.filter((m) => m.anomaly);
  const corrected = d.totals.defaultAddress > 0;
  const exLondon = top.filter((t) => t.label !== "London");
  const csvUrl = `${SITE_URL}/api/research/${d.slug}/data.csv`;

  const table = markdownTable(
    ["#", "Town or city", "Region", `Companies (${p.label})`, "Share of UK total", comp ? `vs ${comp.label}` : "—", "Companies"],
    top.map((cell, i) => [
      i + 1,
      cell.label,
      cell.sub ?? "—",
      fmtInt(cell.value),
      fmtPct(cell.share, 2),
      cell.changePct === null || cell.changePct === undefined ? "—" : fmtDelta(cell.changePct),
      `[View](${cell.href})`,
    ])
  );

  const chartTop = rankedBarChart(top, {
    title: `Company registrations by town and city, ${p.label}`,
    desc: `Horizontal bar chart of new UK company registrations by registered-office town or city in ${p.label}. ${leader.label} leads with ${fmtInt(
      leader.value
    )} registrations.`,
    source: "Source: Companies House register, registered-office address match.",
  });

  const chartYoy = comp
    ? yearOnYearChart(top.slice(0, 12), {
        title: `${p.label} against ${comp.label}, top 12 locations`,
        desc: `Grouped bar chart comparing registrations in the twelve busiest towns and cities in ${p.label} with the same quarter a year earlier.`,
        source: `Source: Companies House register, ${p.label} and ${comp.label}.`,
        currentLabel: p.label,
        previousLabel: comp.label,
      })
    : "";

  const chartMovers =
    risers.length && fallers.length
      ? divergingChart([...risers.slice(0, 6), ...fallers.slice(0, 6)], {
          title: `Fastest rising and falling locations, ${p.label} vs ${comp?.label}`,
          desc: "Diverging bar chart of year-on-year percentage change in registrations by town and city.",
          source: `Source: Companies House register. Places below ${fmtInt(MOVER_FLOOR)} registrations are excluded as too small to read as a trend.`,
        })
      : "";

  const chartMonthly = columnChart(monthly.map((m) => ({ label: m.label, value: m.value })), {
    title: `UK incorporations by month, ${p.label}`,
    desc: `Column chart of total UK incorporations for each month of ${p.label}.`,
    source: "Source: Companies House register, all company types.",
  });

  const body_md = `**${leader.label} took ${fmtInt(leader.value)} new company registrations in ${p.longLabel}** — ${fmtPct(
    leader.share,
    1
  )} of the ${fmtInt(total)} companies incorporated across the UK in the quarter. ${second.label} was next with ${fmtInt(second.value)}.

This report counts registrations for ${fmtInt(d.totals.citiesMeasured)} UK towns and cities, one exact register query each, and compares them with ${
    comp?.label ?? "the prior year"
  }. It measures where companies are *registered*, which is not always where they trade — a distinction we set out in the [methodology](#methodology). The [full dataset](${csvUrl}) is downloadable.

## Key findings

- **${fmtInt(total)} companies were incorporated UK-wide in ${p.label}**, ${dir} ${fmtDelta(Math.abs(totalDelta)).replace("+", "")} on ${comp?.label}.
- **${leader.label} accounted for ${fmtPct(leader.share, 1)} of all UK registrations.**
- **Outside ${leader.label}, ${exLondon[0]?.label} led** with ${fmtInt(exLondon[0]?.value ?? 0)} registrations, ahead of ${exLondon[1]?.label} on ${fmtInt(
    exLondon[1]?.value ?? 0
  )}.
${risers.length ? `- **${risers[0].label} grew fastest**, ${fmtDelta(risers[0].changePct)} year on year to ${fmtInt(risers[0].value)} registrations.` : ""}
${fallers.length ? `- **${fallers[0].label} fell furthest**, ${fmtDelta(fallers[0].changePct)} to ${fmtInt(fallers[0].value)}.` : ""}

## Registrations by town and city

${chartTop}

${table}

A registered office is a legal correspondence address, not a place of business. Accountants and company formation agents register clients at their own addresses, which pulls counts towards city centres — and towards London above all. Read this table as *where companies are registered*, and treat it as a proxy for local business activity only with that in mind.

${
    corrected
      ? `**Cardiff is corrected.** Companies House relocates a company's registered office to its own default address — a Cardiff postcode — when the address is disputed or removed under the Economic Crime and Corporate Transparency Act. That put ${fmtInt(
          d.totals.defaultAddress
        )} companies into Cardiff's raw ${p.label} count, against ${fmtInt(
          d.totals.defaultAddressPrev
        )} in ${comp?.label}. Those companies are not Cardiff businesses, so they are subtracted here. Uncorrected, Cardiff's raw count would read ${fmtInt(d.totals.cardiffRaw)} and its year-on-year movement would be an artefact of enforcement activity rather than anything to do with the Welsh economy.`
      : ""
  }
${
    flagged.length
      ? `\n**Rows flagged for checking.** ${flagged
          .map((f) => `${f.label} (${fmtDelta(f.changePct)})`)
          .join(", ")} moved by more than 75% year on year. A swing that large at one location is normally a bulk registration event at a single address rather than a change in local business formation, so these are reported but not treated as findings.`
      : ""
  }

${
    comp
      ? `## What changed against ${comp.label}

${chartYoy}

${chartMovers}

Percentage changes are shown only for places with at least ${fmtInt(MOVER_FLOOR)} registrations in ${p.label}.`
      : ""
  }

## The quarter month by month

${chartMonthly}

${markdownTable(["Month", "UK incorporations"], monthly.map((m) => [m.label, fmtInt(m.value)]))}

## How to act on this data

Each location below opens a live, pre-filtered list of the active companies registered there in the last 12 months — updated from the register, not frozen at this report's publication date.

${markdownTable(
    ["Location", `New companies (${p.label})`, "Year on year", "See the companies"],
    top.slice(0, 8).map((cell) => [
      cell.label,
      fmtInt(cell.value),
      cell.changePct === null || cell.changePct === undefined ? "—" : fmtDelta(cell.changePct),
      `[Build the ${cell.label} list](${marketSearchHref({ place: cell.label, incorporated: "12m", from: `research:${d.slug}` })})`,
    ])
  )}

For territory planning, the useful comparison is not raw volume but volume against your current coverage: a city with a third of London's registrations and none of your competitors is a better market than one with more companies and a crowded field. [Free new-company alerts](/free-alerts) will send new registrations in a location each week.

## <a id="methodology"></a>Methodology

${d.method.map((m) => `**${m.heading}.** ${m.body}`).join("\n\n")}

**Limitations.**

${d.caveats.map((x) => `- ${x}`).join("\n")}

## Data and licence

- **Period covered:** ${p.from} to ${p.to} (inclusive).
- **Source:** ${d.source.name}.
- **Retrieved:** ${d.source.retrieved.slice(0, 10)}.
- **Licence:** Contains public sector information licensed under the [${d.source.licence}](${d.source.licenceUrl}). Company data © Crown copyright.
- **Download:** [${d.slug}.csv](${csvUrl}).

**Citation.** CompaniesIQ Research (${new Date(d.generatedAt).getFullYear()}). *${d.title}*. Available at: ${SITE_URL}/blog/${d.slug}`;

  return {
    slug: d.slug,
    title: d.title,
    excerpt: `${leader.label} took ${fmtInt(leader.value)} of the ${fmtInt(total)} companies incorporated in the UK in ${p.longLabel}. Exact registration counts for ${fmtInt(
      d.totals.citiesMeasured
    )} towns and cities, with year-on-year change.`,
    meta_description: `Exact Companies House counts: where the UK's ${fmtInt(total)} new companies registered in ${p.label}, by town and city, with YoY change.`.slice(0, 155),
    body_md,
    faq: [
      {
        q: `Which UK city had the most new company registrations in ${p.label}?`,
        a: `${leader.label}, with ${fmtInt(leader.value)} companies incorporated between ${p.from} and ${p.to} — ${fmtPct(
          leader.share,
          1
        )} of all UK registrations in the quarter. ${second.label} was second with ${fmtInt(second.value)}.`,
      },
      {
        q: "Does this show where businesses actually operate?",
        a: "Not exactly. It shows where companies give their registered office, which is a legal correspondence address. Accountants and formation agents register clients at their own addresses, so city-centre and London counts are inflated relative to real trading activity.",
      },
      {
        q: "Why isn't my town listed?",
        a: `The study counts a fixed list of ${fmtInt(d.totals.citiesMeasured)} UK towns and cities, each with its own exact query. Places outside that list are not measured, so their absence says nothing about their activity.`,
      },
      {
        q: "Can I reuse these figures?",
        a: "Yes. The underlying data is Companies House public data under the Open Government Licence v3.0. Please attribute CompaniesIQ Research and link to this page.",
      },
    ],
    related: [
      { label: "Browse UK cities", href: "/city" },
      { label: "UK company database", href: "/company-database" },
      { label: "Free new-company alerts", href: "/free-alerts" },
      { label: "Our data sources", href: "/sources" },
    ],
  };
}

export const cityFormationsStudy: Study = {
  id: "city-formations",
  question: "Which UK towns and cities took the most new company registrations, and how did that change year on year?",
  cadence: "quarter",
  periods: (now) => settledQuarters(now, 2),
  slugFor,
  collect,
  render,
};
