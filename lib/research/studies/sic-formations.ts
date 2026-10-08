// ============================================================
// Study: UK company formations by SIC code
// ------------------------------------------------------------
// Question: which lines of business registered the most new
// companies in a half-year, and how did that change year on year?
//
// Measurement design. There is no published API that ranks SIC
// codes, so the study is run in two stages:
//   1. DISCOVERY (sampled) — pull a stratified sample of companies
//      incorporated in the period, one page per month, and count
//      which SIC codes appear. This decides WHICH codes are worth
//      measuring. No published figure comes from this stage.
//   2. MEASUREMENT (exact) — for every candidate code, ask the
//      register for an exact hit count over the period. Every
//      number in the article comes from this stage.
// Because a code that ranks in the top 20 accounts for roughly 1%
// or more of formations, it appears hundreds of times in a 6,000
// company sample: the chance discovery misses one is negligible,
// and the curated code list is unioned in as a further backstop.
//
// The multi-SIC caveat matters and is stated in every edition:
// a company may register up to four SIC codes, so a company can
// count towards more than one code and the shares do not sum to
// 100%.
// ============================================================
import { classifySic, CURATED_SIC_CODES } from "@/lib/sic";
import { SITE_URL } from "@/lib/site";
import { Collector } from "../collect";
import { monthsIn, settledHalves, yearEarlier } from "../periods";
import { segmentsFor } from "../targeting";
import { markAnomalies } from "../validate";
import { columnChart, divergingChart, fmtDelta, fmtInt, fmtPct, markdownTable, rankedBarChart, yearOnYearChart } from "../charts";
import type { Cell, Dataset, Period, PostDraft, Study } from "../types";

const DISCOVERY_PER_MONTH = 1000;
const CANDIDATE_MIN_FREQ = 3;
const MAX_CANDIDATES = 180;
const TOP_N = 20;
const YOY_N = 40;
/** Below this volume a percentage swing is noise, not a trend. */
const MOVER_FLOOR = 400;

function label(code: string): string {
  const c = classifySic(code);
  return c.category || c.division;
}

async function collect(period: Period, comparison: Period | null): Promise<Dataset> {
  const c = new Collector();
  const months = monthsIn(period);

  // ---- Totals + within-period shape -------------------------------------
  const [total, prevTotal] = await Promise.all([
    c.count(`All incorporations, ${period.label}`, { incorporatedFrom: period.from, incorporatedTo: period.to }),
    comparison
      ? c.count(`All incorporations, ${comparison.label}`, { incorporatedFrom: comparison.from, incorporatedTo: comparison.to })
      : Promise.resolve(0),
  ]);

  const monthly = await c.countMany(months, (m) => ({
    label: `Incorporations, ${m.label} ${period.id.slice(-4)}`,
    params: { incorporatedFrom: m.from, incorporatedTo: m.to },
  }));

  // ---- Stage 1: discovery (sampled — never published as a figure) --------
  const freq = new Map<string, number>();
  let sampled = 0;
  for (const m of months) {
    const items = await c.sample({ incorporatedFrom: m.from, incorporatedTo: m.to, size: DISCOVERY_PER_MONTH });
    sampled += items.length;
    for (const it of items) for (const code of it.sicCodes) freq.set(code, (freq.get(code) ?? 0) + 1);
  }
  const discovered = [...freq.entries()]
    .filter(([code, n]) => n >= CANDIDATE_MIN_FREQ && /^\d{5}$/.test(code))
    .sort((a, b) => b[1] - a[1])
    .map(([code]) => code);
  const candidates = [...new Set([...discovered, ...CURATED_SIC_CODES])].slice(0, MAX_CANDIDATES);

  // ---- Stage 2: measurement (exact counts) ------------------------------
  const counts = await c.countMany(candidates, (code) => ({
    label: `${code} incorporations, ${period.label}`,
    params: { sicCodes: [code], incorporatedFrom: period.from, incorporatedTo: period.to },
  }));

  const ranked: Cell[] = candidates
    .map((code, i) => ({ key: code, label: label(code), sub: classifySic(code).sector, value: counts[i], share: total ? counts[i] / total : undefined }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  // Year-on-year for a wider set than we chart, so "fastest growing" is drawn
  // from a real field of contenders rather than only the largest codes.
  const yoyPool = ranked.slice(0, YOY_N);
  if (comparison) {
    const prevCounts = await c.countMany(yoyPool, (cell) => ({
      label: `${cell.key} incorporations, ${comparison.label}`,
      params: { sicCodes: [cell.key], incorporatedFrom: comparison.from, incorporatedTo: comparison.to },
    }));
    yoyPool.forEach((cell, i) => {
      cell.prev = prevCounts[i];
      cell.change = cell.value - prevCounts[i];
      cell.changePct = prevCounts[i] > 0 ? (cell.value - prevCounts[i]) / prevCounts[i] : null;
    });
  }

  // Closures inside the same window, for the formed-vs-closed picture.
  const top = ranked.slice(0, TOP_N);
  const dissolutions = await c.countMany(top, (cell) => ({
    label: `${cell.key} dissolutions, ${period.label}`,
    params: { sicCodes: [cell.key], dissolvedFrom: period.from, dissolvedTo: period.to },
  }));
  top.forEach((cell, i) => {
    cell.extra = { dissolved: dissolutions[i], net: cell.value - dissolutions[i] };
  });

  markAnomalies(yoyPool);

  const movers = yoyPool
    .filter((x) => x.changePct !== null && x.changePct !== undefined && x.value >= MOVER_FLOOR)
    .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));

  return {
    study: "sic-formations",
    slug: slugFor(period),
    title: `Top SIC codes by new UK company registrations, ${period.label}`,
    period,
    comparison,
    generatedAt: new Date().toISOString(),
    totals: {
      incorporations: total,
      prevIncorporations: prevTotal,
      changePct: prevTotal ? (total - prevTotal) / prevTotal : 0,
      candidatesMeasured: candidates.length,
      codesWithFormations: ranked.length,
    },
    series: [
      { id: "top", label: `Most-registered SIC codes, ${period.label}`, unit: "companies incorporated", cells: top },
      { id: "movers", label: `Year-on-year change, ${period.label} vs ${comparison?.label ?? "n/a"}`, unit: "% change in companies incorporated", cells: movers },
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
        body: `Every figure is an exact hit count from the Companies House advanced company search API, filtered on incorporation date (and SIC code, where stated). Counts were taken on ${new Date().toISOString().slice(0, 10)} and cover companies incorporated between ${period.from} and ${period.to} inclusive, irrespective of whether those companies are still active today.`,
      },
      {
        heading: "How the codes were chosen",
        body: `There is no register endpoint that ranks SIC codes, so candidate codes were identified from a stratified sample of ${fmtInt(sampled)} companies incorporated in the period (one page per month), unioned with the ${CURATED_SIC_CODES.length} codes CompaniesIQ maintains reference pages for. That produced ${fmtInt(candidates.length)} candidate codes, each of which was then counted exactly. Sampling only decides which codes to measure; no published figure is estimated from it.`,
      },
      {
        heading: "Reproducing this",
        body: `Each row can be checked directly against the register. A single query — the advanced search endpoint with \`sic_codes\`, \`incorporated_from\` and \`incorporated_to\` set — returns the same hit count reported here, subject to later register revisions. The full query ledger for this edition is available in the dataset download.`,
      },
    ],
    caveats: [
      "A company may register up to four SIC codes. Companies are therefore counted under each code they list, and the shares below do not sum to 100%.",
      "These are registrations, not trading businesses. A registered company may never trade, and formation agents register companies in bulk.",
      "Counts move slightly over time as late registrations and corrections are processed by Companies House.",
    ],
    queries: c.ledger,
    source: {
      name: "Companies House register (advanced company search API)",
      url: "https://developer.company-information.service.gov.uk/",
      licence: "Open Government Licence v3.0",
      licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
      retrieved: new Date().toISOString(),
    },
    sampleSize: sampled,
  };
}

function slugFor(period: Period): string {
  return `top-sic-codes-uk-company-registrations-${period.id}`;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

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
  const runnerUp = top[1];
  // Anomalous rows stay in the tables but never become a headline claim.
  const risers = movers.filter((m) => (m.changePct ?? 0) > 0 && !m.anomaly).slice(0, 6);
  const fallers = movers.filter((m) => (m.changePct ?? 0) < 0 && !m.anomaly).slice(-6).reverse();
  const peak = [...monthly].sort((a, b) => b.value - a.value)[0];
  const trough = [...monthly].sort((a, b) => a.value - b.value)[0];
  const segments = segmentsFor(top, 8, `research:${d.slug}`);
  const csvUrl = `${SITE_URL}/api/research/${d.slug}/data.csv`;

  // Describe the composition of the leading codes from the data rather than
  // asserting a narrative about it: how the top ten distribute across sectors.
  // One angle per sector: repeating the same sentence under two codes from the
  // same sector reads as filler, because it is.
  const seenSectors = new Set<string>();
  const uniqueAngles = segments.filter((s) => (seenSectors.has(s.sector) ? false : (seenSectors.add(s.sector), true))).slice(0, 4);

  const sectorCounts = new Map<string, number>();
  for (const cell of top.slice(0, 10)) sectorCounts.set(cell.sub ?? "Unclassified", (sectorCounts.get(cell.sub ?? "Unclassified") ?? 0) + 1);
  const mix = [...sectorCounts.entries()].sort((a, b) => b[1] - a[1]);
  const sectorMix = `Of the ten largest codes, ${mix
    .slice(0, 3)
    .map(([sector, n]) => `${n} ${n === 1 ? "sits" : "sit"} in ${sector.toLowerCase()}`)
    .join(", ")}${mix.length > 3 ? `, and the remainder are spread across ${mix.length - 3} further sectors` : ""}.`;

  const topTable = markdownTable(
    ["#", "SIC code", "Activity", "Sector", `Companies (${p.label})`, "Share of all", comp ? `vs ${comp.label}` : "—"],
    top.map((cCell, i) => [
      i + 1,
      `[${cCell.key}](/sic/${cCell.key})`.replace(/^\[(\d+)\]\(\/sic\/\1\)$/, (m, code) => (CURATED_SIC_CODES.includes(code) ? m : code)),
      cCell.label,
      cCell.sub ?? "—",
      fmtInt(cCell.value),
      fmtPct(cCell.share, 2),
      cCell.changePct === null || cCell.changePct === undefined ? "—" : fmtDelta(cCell.changePct),
    ])
  );

  const netTable = markdownTable(
    ["SIC code", "Activity", `Formed in ${p.label}`, `Dissolved in ${p.label}`, "Net"],
    top.slice(0, 12).map((cCell) => [
      cCell.key,
      cCell.label,
      fmtInt(cCell.value),
      fmtInt(cCell.extra?.dissolved ?? 0),
      (cCell.extra?.net ?? 0) >= 0 ? `+${fmtInt(cCell.extra?.net ?? 0)}` : `−${fmtInt(Math.abs(cCell.extra?.net ?? 0))}`,
    ])
  );

  const moversTable = markdownTable(
    ["SIC code", "Activity", `${p.label}`, `${comp?.label ?? ""}`, "Change"],
    [...risers.slice(0, 5), ...fallers.slice(0, 5)].map((m) => [
      m.key,
      m.label,
      fmtInt(m.value),
      fmtInt(m.prev ?? 0),
      fmtDelta(m.changePct),
    ])
  );

  const segmentTable = markdownTable(
    ["Segment", `New companies (${p.label})`, "Who sells into it", "See the companies"],
    segments.map((s) => [
      `**${s.label}** (${s.code})`,
      fmtInt(s.volume),
      s.buyers,
      `[Build the list](${s.listHref}) · [About this code](${s.href})`,
    ])
  );

  const chartTop = rankedBarChart(top, {
    title: `The 20 most-registered SIC codes, ${p.label}`,
    desc: `Horizontal bar chart ranking the twenty SIC codes with the most new UK company registrations in ${p.label}. ${leader.label} leads with ${fmtInt(
      leader.value
    )} companies, followed by ${runnerUp.label} with ${fmtInt(runnerUp.value)}.`,
    source: "Source: Companies House register. Companies may list up to four SIC codes.",
  });

  const chartYoy = comp
    ? yearOnYearChart(top.slice(0, 12), {
        title: `${p.label} against ${comp.label}, top 12 codes`,
        desc: `Grouped bar chart comparing new company registrations for the twelve largest SIC codes in ${p.label} against the same period a year earlier.`,
        source: `Source: Companies House register, ${p.label} and ${comp.label}.`,
        currentLabel: p.label,
        previousLabel: comp.label,
      })
    : "";

  const chartMovers =
    risers.length && fallers.length
      ? divergingChart([...risers.slice(0, 6), ...fallers.slice(0, 6)], {
          title: `Fastest rising and falling activities, ${p.label} vs ${comp?.label}`,
          desc: `Diverging bar chart of year-on-year percentage change in registrations for the SIC codes that moved most, among codes registering at least ${fmtInt(
            MOVER_FLOOR
          )} companies in ${p.label}.`,
          source: `Source: Companies House register. Codes below ${fmtInt(MOVER_FLOOR)} registrations are excluded as too small to read as a trend.`,
        })
      : "";

  const chartMonthly = columnChart(
    monthly.map((m) => ({ label: m.label, value: m.value })),
    {
      title: `UK incorporations by month, ${p.label}`,
      desc: `Column chart of total UK company incorporations for each month of ${p.label}, peaking in ${peak.label} at ${fmtInt(
        peak.value
      )} and lowest in ${trough.label} at ${fmtInt(trough.value)}.`,
      source: "Source: Companies House register, all company types.",
    }
  );

  const riserLine = risers.length
    ? `${risers[0].label} (SIC ${risers[0].key}) grew fastest among codes of meaningful size, ${fmtDelta(risers[0].changePct)} to ${fmtInt(
        risers[0].value
      )} registrations.`
    : "";
  const fallerLine = fallers.length
    ? `${fallers[0].label} (SIC ${fallers[0].key}) fell hardest, ${fmtDelta(fallers[0].changePct)} to ${fmtInt(fallers[0].value)}.`
    : "";

  const body_md = `**${fmtInt(total)} companies were incorporated in the UK in ${p.longLabel}** — ${
    dir === "up" ? "up" : "down"
  } ${fmtDelta(Math.abs(totalDelta)).replace("+", "")} on ${comp?.longLabel ?? "the year before"}, when ${fmtInt(prev)} were registered. The single most-registered activity was **${
    leader.label
  } (SIC ${leader.key})** with ${fmtInt(leader.value)} new companies, ${fmtPct(leader.share, 2)} of every company formed in the period.

This report measures the whole period exactly, code by code, from the Companies House register. It covers what was registered, what grew and shrank against ${
    comp?.label ?? "the prior year"
  }, how formations moved month by month, and which segments are worth acting on. [Methodology](#methodology) and the [full dataset](${csvUrl}) are at the end.

## Key findings

- **${fmtInt(total)} incorporations in ${p.label}**, ${dir} ${fmtDelta(Math.abs(totalDelta)).replace("+", "")} year on year (${fmtInt(prev)} in ${comp?.label}).
- **${leader.label} (${leader.key}) was the most-registered activity**, with ${fmtInt(leader.value)} new companies — ahead of ${runnerUp.label} (${runnerUp.key}) on ${fmtInt(runnerUp.value)}.
- **The top three codes together account for ${fmtPct(
    (top[0].value + top[1].value + top[2].value) / total,
    1
  )} of all registrations** (companies may list more than one code, so this is a share of companies, not a partition).
- ${riserLine}
- ${fallerLine}
- **${peak.label} was the busiest month** with ${fmtInt(peak.value)} incorporations; ${trough.label} was the quietest at ${fmtInt(trough.value)}.

## The most-registered SIC codes in ${p.label}

${chartTop}

${topTable}

${sectorMix} A caveat that matters when reading any SIC ranking: **a company may register up to four SIC codes**, so a single company can appear under several rows here. The shares are shares *of companies incorporated*, not slices of a pie, and they do not sum to 100%.

It is also worth being precise about what a registration is. These are companies added to the register — not businesses that have started trading, hired anyone or invoiced a customer. Company formation agents register companies in volume, and some codes (particularly holding and property vehicles) reflect structuring rather than new economic activity.

${
    comp
      ? `## What changed against ${comp.label}

${chartYoy}

${chartMovers}

${moversTable}

Percentage changes are only reported for codes registering at least ${fmtInt(
          MOVER_FLOOR
        )} companies in ${p.label}. Below that, a swing of tens of companies produces a dramatic-looking percentage that says nothing about the underlying market.`
      : ""
  }

## Formation is only half the picture

A code with high registrations and equally high dissolutions is churning, not growing. The table below sets new registrations against companies dissolved in the same window — note that dissolutions cover companies of *any* age, not just those formed in ${p.label}, so this is a measure of net register movement rather than a survival rate.

${netTable}

## How formations moved through the period

${chartMonthly}

${markdownTable(["Month", "Incorporations"], monthly.map((m) => [m.label, fmtInt(m.value)]))}

Monthly formation volume is strongly seasonal and sensitive to working days, bank holidays and the tax year. Read the shape, not any single month.

## How to act on this data

Rankings are only useful if you can reach the companies behind them. Each segment below links to the live list of companies on that code — the register updated daily, not a snapshot of this report.

${segmentTable}

The commercial reading, sector by sector, is straightforward:

${uniqueAngles.map((s) => `- **${s.label}.** ${s.angle}`).join("\n")}

If you want these companies as they appear rather than in a half-yearly report, [free new-company alerts](/free-alerts) send new registrations matching your criteria each week, and [company monitoring](/company-monitoring) tracks changes on companies you already care about.

## <a id="methodology"></a>Methodology

${d.method.map((m) => `**${m.heading}.** ${m.body}`).join("\n\n")}

**Limitations.**

${d.caveats.map((x) => `- ${x}`).join("\n")}

## Data and licence

- **Period covered:** ${p.from} to ${p.to} (inclusive).
- **Source:** ${d.source.name}.
- **Retrieved:** ${d.source.retrieved.slice(0, 10)}.
- **Licence:** Contains public sector information licensed under the [${d.source.licence}](${d.source.licenceUrl}). Company data © Crown copyright.
- **Download:** [${d.slug}.csv](${csvUrl}) — every measured code, both periods, and the query behind each figure.

**Citation.** CompaniesIQ Research (${new Date(d.generatedAt).getFullYear()}). *${d.title}*. Available at: ${SITE_URL}/blog/${d.slug}

You are welcome to reuse these figures and charts with attribution and a link to this page.`;

  return {
    slug: d.slug,
    title: d.title,
    excerpt: `${fmtInt(total)} companies were incorporated in the UK in ${p.longLabel}, ${dir} ${fmtDelta(Math.abs(totalDelta)).replace(
      "+",
      ""
    )} year on year. Exact counts for the ${TOP_N} most-registered SIC codes, what grew, what shrank, and who to target.`,
    meta_description: `${fmtInt(total)} UK companies incorporated in ${p.label} (${dir} ${fmtDelta(Math.abs(totalDelta)).replace(
      "+",
      ""
    )} YoY). Exact Companies House counts for the top ${TOP_N} SIC codes.`.slice(0, 155),
    body_md,
    faq: [
      {
        q: `Which SIC code had the most new UK company registrations in ${p.label}?`,
        a: `${leader.label} (SIC ${leader.key}) had the most, with ${fmtInt(leader.value)} companies incorporated between ${p.from} and ${p.to} — ${fmtPct(
          leader.share,
          2
        )} of all UK incorporations in the period. ${runnerUp.label} (SIC ${runnerUp.key}) was second with ${fmtInt(runnerUp.value)}.`,
      },
      {
        q: `How many companies were registered in the UK in ${p.label}?`,
        a: `${fmtInt(total)} companies were incorporated between ${p.from} and ${p.to}, compared with ${fmtInt(prev)} in ${
          comp?.label ?? "the same period a year earlier"
        } — a change of ${fmtDelta(totalDelta)}.`,
      },
      {
        q: "Do the SIC code shares add up to 100%?",
        a: "No. A company may register up to four SIC codes, so it is counted under each code it lists. Each share is the percentage of companies incorporated in the period that listed that code, not a slice of a pie.",
      },
      {
        q: "Are these figures the same as new businesses starting up?",
        a: "No. They count companies added to the Companies House register. A registered company may never trade, and formation agents register companies in bulk. For trading-business estimates, ONS business demography is the appropriate source.",
      },
      {
        q: "Can I reuse these figures?",
        a: `Yes. The underlying data is Companies House public data, licensed under the Open Government Licence v3.0. Please attribute CompaniesIQ Research and link to this page. The full dataset is available as a CSV download.`,
      },
    ],
    related: [
      { label: "SIC code search", href: "/sic" },
      { label: "UK company database", href: "/company-database" },
      { label: "Free new-company alerts", href: "/free-alerts" },
      { label: "Our data sources", href: "/sources" },
    ],
  };
}

export const sicFormationsStudy: Study = {
  id: "sic-formations",
  question: "Which SIC codes registered the most new UK companies, and how did that change year on year?",
  cadence: "half",
  periods: (now) => settledHalves(now, 2),
  slugFor,
  collect,
  render,
};

export { yearEarlier };
