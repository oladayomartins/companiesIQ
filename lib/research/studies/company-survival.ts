// ============================================================
// Study: what happens to new UK companies after incorporation
// ------------------------------------------------------------
// Question: of the companies incorporated in a given year, how many
// are still on the register as active, and how quickly do the rest
// dissolve?
//
// Measurement design. Ten annual cohorts (companies incorporated in
// one calendar year). For each cohort, exact counts of:
//   · every company incorporated in the year (all statuses);
//   · those dissolved by 31 December of each following year, up to
//     the snapshot date — the cohort's dissolution curve;
//   · status today (active, dissolved, in liquidation).
// Then one cohort old enough to read at five years is split by
// twelve common SIC codes, so the curve can be compared by line of
// business.
//
// Ages are by calendar year, not to the day: a company formed in
// December and one formed in January of the same year share a
// cohort. That blurs the first year (a "year 1" figure covers 12–24
// months of life) and is stated in every edition.
//
// The single most important caveat: dissolution is not failure.
// Most dissolutions are voluntary strike-offs — a project ended, a
// contractor took a job, a holding vehicle was no longer needed.
// The article says so in the first section, not just the footnotes.
// ============================================================
import { SITE_URL } from "@/lib/site";
import { marketSearchHref } from "@/lib/market-link";
import { Collector } from "../collect";
import { settledHalves } from "../periods";
import { columnChart, fmtInt, fmtPct, markdownTable, rankedBarChart } from "../charts";
import type { Issue } from "../validate";
import type { Cell, Dataset, Period, PostDraft, Study } from "../types";

const COHORTS = 10;
/** Cohort split by SIC code: old enough to read at five full years. */
const SIC_COHORT_AGE = 5;

// Official SIC 2007 descriptions, shortened only where they run long. Chosen
// to span the commonest kinds of new company — online retail, contracting,
// property, hospitality, haulage — not to flatter any sector.
const SIC_PANEL: { code: string; label: string }[] = [
  { code: "47910", label: "Retail via mail order or internet" },
  { code: "62020", label: "IT consultancy" },
  { code: "70229", label: "Management consultancy" },
  { code: "68209", label: "Letting of own or leased property" },
  { code: "68100", label: "Buying and selling own real estate" },
  { code: "41100", label: "Development of building projects" },
  { code: "43999", label: "Specialised construction activities" },
  { code: "56101", label: "Licensed restaurants" },
  { code: "49410", label: "Freight transport by road" },
  { code: "96090", label: "Other personal service activities" },
  { code: "82990", label: "Other business support services" },
  { code: "86900", label: "Other human health activities" },
];

const yearOf = (iso: string) => Number(iso.slice(0, 4));
/** Companies House paused strike-offs during the pandemic; see render(). */
const STRIKE_OFF_PAUSE_YEAR = 2020;
const yearEnd = (y: number) => `${y}-12-31`;

function slugFor(period: Period): string {
  return `uk-company-survival-rates-${period.id}`;
}

async function collect(period: Period): Promise<Dataset> {
  const c = new Collector();
  const snapshot = period.to;
  const snapYear = yearOf(snapshot);
  // The newest cohort is the last COMPLETE calendar year before the snapshot.
  const newest = snapYear - 1;
  const years = Array.from({ length: COHORTS }, (_, i) => newest - (COHORTS - 1) + i);
  const inc = (y: number) => ({ incorporatedFrom: `${y}-01-01`, incorporatedTo: yearEnd(y) });

  const sizes = await c.countMany(years, (y) => ({ label: `Incorporated ${y}`, params: inc(y) }));
  const active = await c.countMany(years, (y) => ({ label: `Incorporated ${y}, active now`, params: { ...inc(y), status: ["active"] } }));
  // Status today is read at one moment: active, dissolved and liquidation all
  // undated, so the three are mutually consistent.
  const dissolvedNow = await c.countMany(years, (y) => ({
    label: `Incorporated ${y}, dissolved now`,
    params: { ...inc(y), status: ["dissolved"] },
  }));
  const liquidation = await c.countMany(years, (y) => ({
    label: `Incorporated ${y}, in liquidation now`,
    params: { ...inc(y), status: ["liquidation"] },
  }));

  // Dissolution curve: dissolved by the end of the Nth calendar year after
  // incorporation, for every N that has fully elapsed by the snapshot.
  const curvePoints = years.flatMap((y) =>
    Array.from({ length: snapYear - 1 - y }, (_, i) => ({ y, n: i + 1 })).filter(({ y: yy, n }) => yy + n <= newest)
  );
  const curveCounts = await c.countMany(curvePoints, ({ y, n }) => ({
    label: `Incorporated ${y}, dissolved by ${yearEnd(y + n)}`,
    params: { ...inc(y), status: ["dissolved"], dissolvedTo: yearEnd(y + n) },
  }));
  const curve = new Map(curvePoints.map((p, i) => [`${p.y}:${p.n}`, curveCounts[i]]));

  const cohorts: Cell[] = years.map((y, i) => {
    const extra: Record<string, number> = {
      active: active[i],
      dissolved: dissolvedNow[i],
      liquidation: liquidation[i],
    };
    for (let n = 1; y + n <= newest; n++) extra[`dissolvedBy${n}`] = curve.get(`${y}:${n}`) ?? 0;
    return {
      key: String(y),
      label: String(y),
      value: sizes[i],
      share: sizes[i] ? active[i] / sizes[i] : undefined,
      extra,
    };
  });

  // ---- Survival by line of business, one cohort at five years ------------
  const sicYear = newest - SIC_COHORT_AGE;
  const sicCut = yearEnd(sicYear + SIC_COHORT_AGE);
  const sicSizes = await c.countMany(SIC_PANEL, (s) => ({
    label: `SIC ${s.code}, incorporated ${sicYear}`,
    params: { ...inc(sicYear), sicCodes: [s.code] },
  }));
  const sicDissolved = await c.countMany(SIC_PANEL, (s) => ({
    label: `SIC ${s.code}, incorporated ${sicYear}, dissolved by ${sicCut}`,
    params: { ...inc(sicYear), sicCodes: [s.code], status: ["dissolved"], dissolvedTo: sicCut },
  }));
  const bySic: Cell[] = SIC_PANEL.map((s, i) => ({
    key: s.code,
    label: s.label,
    sub: s.code,
    value: sicSizes[i],
    // Share = still not dissolved five full years on.
    share: sicSizes[i] ? 1 - sicDissolved[i] / sicSizes[i] : undefined,
    extra: { dissolved: sicDissolved[i] },
    href: `/sic/${s.code}`,
  }))
    .filter((x) => x.value > 0)
    .sort((a, b) => (b.share ?? 0) - (a.share ?? 0));

  const totalCohorts = sizes.reduce((a, b) => a + b, 0);

  return {
    study: "company-survival",
    slug: slugFor(period),
    title: `What happens to new UK companies? Survival rates for ${years[0]}–${newest} incorporations`,
    period,
    comparison: null,
    generatedAt: new Date().toISOString(),
    totals: {
      incorporations: totalCohorts,
      firstCohort: years[0],
      newestCohort: newest,
      sicCohort: sicYear,
      sicAge: SIC_COHORT_AGE,
    },
    series: [
      { id: "top", label: "Annual incorporation cohorts", unit: "companies incorporated", cells: cohorts },
      { id: "by-sic", label: `Cohort ${sicYear}, not dissolved after ${SIC_COHORT_AGE} full years, by SIC code`, unit: "share surviving", cells: bySic },
    ],
    method: [
      {
        heading: "Where the figures come from",
        body: `Every figure is an exact hit count from the Companies House advanced company search API, taken on ${new Date()
          .toISOString()
          .slice(0, 10)}. A cohort is every company incorporated between 1 January and 31 December of one year, in any status today.`,
      },
      {
        heading: "How survival is measured",
        body: `Dissolution counts filter a cohort on company status "dissolved" and on dissolution date. "Dissolved by the end of year N" counts companies dissolved on or before 31 December of the Nth calendar year after the cohort year. A company counts as surviving if it has not been dissolved by that date; this includes companies that are dormant, in liquidation or in administration.`,
      },
      {
        heading: "The 2020 strike-off pause",
        body: `Companies House temporarily paused striking companies off the register in ${STRIKE_OFF_PAUSE_YEAR} in response to the pandemic. Dissolution counts for that year are depressed and those for the following year correspondingly raised. Figures are reported as measured; affected comparisons are flagged in the text.`,
      },
      {
        heading: "Line of business",
        body: `The SIC-code panel uses the ${sicYear} cohort and a five-full-year horizon (dissolved by ${sicCut}). The twelve codes were chosen in advance to cover the most common kinds of new company, not selected after looking at the results.`,
      },
    ],
    caveats: [
      "Dissolution is not the same as business failure. Most companies are dissolved by voluntary strike-off by their own directors — a project finished, a contractor took a permanent job, a holding vehicle was no longer needed — rather than through insolvency.",
      "Ages are measured in calendar years, so a cohort mixes companies up to twelve months apart in age. A 'first year' figure covers between 12 and 24 months of life.",
      "A company counted as surviving is not necessarily trading: dormant companies and those in liquidation have not yet been dissolved.",
      "A company can list up to four SIC codes, so the SIC-code panel counts a company under every code it lists and the rows overlap.",
      "Counts move slightly over time as companies are restored to the register after dissolution.",
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

/** Integrity checks specific to cohort data. */
function check(d: Dataset): Issue[] {
  const issues: Issue[] = [];
  for (const cell of d.series.find((s) => s.id === "top")?.cells ?? []) {
    const x = cell.extra ?? {};
    if (x.active + x.dissolved + x.liquidation > cell.value) {
      issues.push({ level: "block", check: "part-exceeds-whole", detail: `Cohort ${cell.key}: statuses sum past the cohort size.` });
    }
    // A dissolution curve can only rise.
    let last = 0;
    for (let n = 1; `dissolvedBy${n}` in x; n++) {
      const v = x[`dissolvedBy${n}`];
      if (v < last) issues.push({ level: "block", check: "curve-monotonic", detail: `Cohort ${cell.key}: dissolved-by count falls at year ${n}.` });
      if (v > x.dissolved * 1.01) issues.push({ level: "block", check: "curve-bound", detail: `Cohort ${cell.key}: year ${n} exceeds today's dissolved total.` });
      last = v;
    }
  }
  return issues;
}

/** Share of a cohort dissolved by the end of year N, or null if not yet observable. */
function dissolvedShare(cell: Cell, n: number): number | null {
  const v = cell.extra?.[`dissolvedBy${n}`];
  return v === undefined || !cell.value ? null : v / cell.value;
}

function render(d: Dataset): PostDraft {
  const cohorts = d.series.find((s) => s.id === "top")!.cells;
  const bySic = d.series.find((s) => s.id === "by-sic")!.cells;
  const csvUrl = `${SITE_URL}/api/research/${d.slug}/data.csv`;
  const first = cohorts[0];
  const newest = cohorts[cohorts.length - 1];
  const sicYear = d.totals.sicCohort;
  const asAt = d.source.retrieved.slice(0, 10);

  // Headline: the oldest cohort's position today, and the average first-year rate.
  const oldestActive = first.share ?? 0;
  const oldestDissolved = (first.extra?.dissolved ?? 0) / (first.value || 1);
  // Companies House paused striking companies off in 2020 (pandemic), so a
  // cohort whose first year ended in 2020 looks artificially healthy at year 1.
  // It stays in the table, explained, but out of the headline range.
  const pausedY1 = (c: Cell) => Number(c.key) + 1 === STRIKE_OFF_PAUSE_YEAR;
  const y1Cells = cohorts.filter((c) => dissolvedShare(c, 1) !== null);
  const y1 = y1Cells.filter((c) => !pausedY1(c)).map((c) => dissolvedShare(c, 1)!);
  const y1Min = Math.min(...y1);
  const y1Max = Math.max(...y1);
  const y1First = y1Cells[0];
  const y1Last = y1Cells[y1Cells.length - 1];
  const y2Cells = cohorts.filter((c) => dissolvedShare(c, 2) !== null);
  const y2First = y2Cells[0];
  const y2Last = y2Cells[y2Cells.length - 1];
  const pauseCohort = y1Cells.find(pausedY1);
  const y5 = cohorts.map((c) => ({ c, v: dissolvedShare(c, 5) })).filter((x): x is { c: Cell; v: number } => x.v !== null);
  const y5Latest = y5[y5.length - 1];
  const bestSic = bySic[0];
  const worstSic = bySic[bySic.length - 1];

  // Wide table: one row per cohort, columns = dissolved by end of year N.
  const maxN = Math.max(...cohorts.map((c) => Object.keys(c.extra ?? {}).filter((k) => k.startsWith("dissolvedBy")).length));
  const showN = [1, 2, 3, 5, 7, 9].filter((n) => n <= maxN);
  const curveTable = markdownTable(
    ["Cohort", "Incorporated", ...showN.map((n) => `Dissolved by end of year ${n}`)],
    cohorts.map((c) => [
      c.label,
      fmtInt(c.value),
      ...showN.map((n) => {
        const s = dissolvedShare(c, n);
        return s === null ? "—" : fmtPct(s, 1);
      }),
    ])
  );

  const statusTable = markdownTable(
    ["Cohort", "Incorporated", "Active today", "Dissolved", "In liquidation", "Other status"],
    cohorts.map((c) => {
      const x = c.extra ?? {};
      const other = Math.max(0, c.value - x.active - x.dissolved - x.liquidation);
      return [c.label, fmtInt(c.value), fmtPct(x.active / c.value, 1), fmtPct(x.dissolved / c.value, 1), fmtPct(x.liquidation / c.value, 2), fmtInt(other)];
    })
  );

  const sicTable = markdownTable(
    ["Line of business (SIC)", `Incorporated ${sicYear}`, `Not dissolved after ${d.totals.sicAge} years`, "See the companies"],
    bySic.map((s) => [
      `**${s.label}** (${s.key})`,
      fmtInt(s.value),
      fmtPct(s.share, 1),
      `[Build the list](${marketSearchHref({ sic: s.key, incorporated: "12m", from: `research:${d.slug}` })})`,
    ])
  );

  const chartActive = columnChart(
    cohorts.map((c) => ({ label: c.label, value: Math.round((c.share ?? 0) * 1000) / 10 })),
    {
      title: "Share of each year's new companies still active today (%)",
      desc: `Column chart of the percentage of companies incorporated in each year from ${first.label} to ${newest.label} that are active on the register as at ${asAt}. Older cohorts have had longer to dissolve.`,
      source: `Source: Companies House register, status as at ${asAt}.`,
      maxValue: 100,
      format: (n) => `${n.toFixed(0)}%`,
    }
  );

  const chartSic = rankedBarChart(
    bySic.map((s) => ({ ...s, value: Math.round((s.share ?? 0) * 1000) / 10 })),
    {
      title: `Companies formed in ${sicYear} not dissolved after five full years, by line of business (%)`,
      desc: `Horizontal bar chart ranking twelve SIC codes by the share of their ${sicYear} incorporations not dissolved by the end of ${sicYear + 5}. ${bestSic.label} is highest at ${fmtPct(
        bestSic.share,
        1
      )}; ${worstSic.label} is lowest at ${fmtPct(worstSic.share, 1)}.`,
      source: "Source: Companies House register. Companies may list up to four SIC codes.",
      maxValue: 100,
      format: (n) => `${n.toFixed(1)}%`,
    }
  );

  const body_md = `**Of the ${fmtInt(first.value)} companies incorporated in the UK in ${first.label}, ${fmtPct(
    oldestActive,
    1
  )} are still active on the register today and ${fmtPct(oldestDissolved, 1)} have been dissolved.** Newer companies are leaving the register faster: ${fmtPct(
    dissolvedShare(y1Last, 1),
    1
  )} of companies formed in ${y1Last.label} were dissolved by the end of the following year, against ${fmtPct(dissolvedShare(y1First, 1), 1)} of the ${y1First.label} cohort.

This report follows ${fmtInt(d.totals.incorporations)} companies — every UK incorporation from ${first.label} to ${newest.label}, in ${cohorts.length} annual cohorts — and measures how many were dissolved, and when, using exact Companies House counts. The [full dataset](${csvUrl}) is downloadable, with the query behind every figure.

## Read this first: dissolved does not mean failed

Dissolution is not the same as business failure. Most companies are dissolved by voluntary strike-off by their own directors — a project finished, a contractor took a permanent job, a holding vehicle was no longer needed — rather than through insolvency. The share of each cohort that is in liquidation today is a small fraction of the share that has been dissolved (see the [status table](#status-today)). So the figures below describe how long UK companies *stay on the register*, which is a different question from how long businesses *trade successfully*.

## Key findings

- **${fmtPct(oldestActive, 1)} of companies formed in ${first.label} are active today**, ${cohorts.length - 1} full years on.
- **Early dissolution is rising.** By the end of the year after incorporation, ${fmtPct(dissolvedShare(y1First, 1), 1)} of the ${y1First.label} cohort had been dissolved; for the ${y1Last.label} cohort it was ${fmtPct(
    dissolvedShare(y1Last, 1),
    1
  )}. By the end of year two the figure rose from ${fmtPct(dissolvedShare(y2First, 2), 1)} (${y2First.label}) to ${fmtPct(dissolvedShare(y2Last, 2), 1)} (${y2Last.label}).
- **Across the measured cohorts, ${fmtPct(y1Min, 1)} to ${fmtPct(y1Max, 1)} of new companies were dissolved by the end of the following year**${pauseCohort ? ` (excluding ${pauseCohort.label}; see below)` : ""}.
${y5Latest ? `- **By the end of their fifth full year, ${fmtPct(y5Latest.v, 1)} of the ${y5Latest.c.label} cohort had been dissolved.**` : ""}
- **Line of business matters.** Of companies formed in ${sicYear}, ${fmtPct(bestSic.share, 1)} of those registered under ${bestSic.label.toLowerCase()} (${bestSic.key}) had not been dissolved five years later, against ${fmtPct(
    worstSic.share,
    1
  )} for ${worstSic.label.toLowerCase()} (${worstSic.key}).

## How many new companies are still active?

${chartActive}

Older cohorts naturally show lower shares: they have simply had longer in which to dissolve. The comparison that controls for age is the dissolution curve below.

## The dissolution curve, cohort by cohort

Each cell is the share of a cohort dissolved by 31 December of the given year after incorporation. Read across a row to see one cohort age; read down a column to compare cohorts at the same age.

${curveTable}

Ages are measured in calendar years, so a cohort mixes companies up to twelve months apart in age. A 'first year' figure covers between 12 and 24 months of life. A dash means the cohort is not yet old enough to measure at that age.${
    pauseCohort
      ? `

**Why ${pauseCohort.label} looks different.** In ${STRIKE_OFF_PAUSE_YEAR}, Companies House temporarily paused the process for striking companies off the register in response to the pandemic. Companies formed in ${pauseCohort.label} reached the end of their first full year during that pause, so their year-one figure (${fmtPct(
          dissolvedShare(pauseCohort, 1),
          1
        )}) reflects delayed dissolutions, not healthier companies — by year two the cohort is back in line with its neighbours. It is excluded from the headline range.`
      : ""
  }

## <a id="status-today"></a>Where each cohort stands today

${statusTable}

A company counted as surviving is not necessarily trading: dormant companies and those in liquidation have not yet been dissolved. "Other status" covers administration, receivership, voluntary arrangements and conversions.

## Survival by line of business

${chartSic}

${sicTable}

A company can list up to four SIC codes, so the SIC-code panel counts a company under every code it lists and the rows overlap. The twelve codes were fixed before the data was pulled.

## What this means if you sell to new companies

A new company is a time-limited prospect. The curve above says a meaningful share of every cohort is gone within two years — so a list of companies formed eighteen months ago already contains businesses that no longer exist, and a list bought last year is worse.

- **Work new companies early.** The first months after incorporation are when a company opens a bank account, appoints an accountant, buys insurance and builds a website. They are also the months before attrition thins the list.
- **Weight by line of business.** Sectors whose companies stay on the register longer are better long-term account prospects; high-churn sectors reward speed and volume over account planning.
- **Refresh lists against the register.** Checking status before outreach removes dissolved companies — the cheapest deliverability and reputation win available.

The "Build the list" links in the table above open the live register for each line of business, filtered to active companies formed in the last 12 months. [Free new-company alerts](/free-alerts) send new registrations each week.

## <a id="methodology"></a>Methodology

${d.method.map((m) => `**${m.heading}.** ${m.body}`).join("\n\n")}

**Limitations.**

${d.caveats.map((x) => `- ${x}`).join("\n")}

## Data and licence

- **Cohorts covered:** companies incorporated ${first.label}-01-01 to ${newest.label}-12-31; dissolution curve to ${newest.label}-12-31; status as at ${asAt}.
- **Source:** ${d.source.name}.
- **Retrieved:** ${d.source.retrieved.slice(0, 10)}.
- **Licence:** Contains public sector information licensed under the [${d.source.licence}](${d.source.licenceUrl}). Company data © Crown copyright.
- **Download:** [${d.slug}.csv](${csvUrl}) — every cohort, every curve point, and the query behind each figure.

**Citation.** CompaniesIQ Research (${new Date(d.generatedAt).getFullYear()}). *${d.title}*. Available at: ${SITE_URL}/blog/${d.slug}`;

  return {
    slug: d.slug,
    title: d.title,
    excerpt: `${fmtPct(oldestActive, 1)} of UK companies formed in ${first.label} are still active. Exact Companies House cohort data on how many new companies dissolve, how fast, and in which lines of business.`,
    meta_description: `How many new UK companies survive? Exact Companies House data on ${fmtInt(
      d.totals.incorporations
    )} incorporations, ${first.label}–${newest.label}, by year and sector.`.slice(0, 155),
    body_md,
    faq: [
      {
        q: "What percentage of new UK companies are still active after ten years?",
        a: `Of the ${fmtInt(first.value)} companies incorporated in ${first.label}, ${fmtPct(oldestActive, 1)} were active on the Companies House register as at ${asAt}.`,
      },
      {
        q: "How many new companies are dissolved in their first year?",
        a: `Between ${fmtPct(y1Min, 1)} and ${fmtPct(y1Max, 1)} of each annual cohort was dissolved by the end of the calendar year after incorporation, and the rate has risen: ${fmtPct(
          dissolvedShare(y1Last, 1),
          1
        )} for companies formed in ${y1Last.label}, against ${fmtPct(dissolvedShare(y1First, 1), 1)} for ${y1First.label}.`,
      },
      {
        q: "Does a dissolved company mean the business failed?",
        a: "No. Most dissolutions are voluntary strike-offs by the company's own directors. Insolvency (liquidation) accounts for a small fraction. Dissolution measures how long a company stays on the register, not whether the business behind it succeeded.",
      },
      {
        q: "Can I reuse these figures?",
        a: "Yes. The underlying data is Companies House public data under the Open Government Licence v3.0. Please attribute CompaniesIQ Research and link to this page.",
      },
    ],
    related: [
      { label: "SIC code directory", href: "/sic" },
      { label: "UK company database", href: "/company-database" },
      { label: "Free new-company alerts", href: "/free-alerts" },
      { label: "Our data sources", href: "/sources" },
    ],
  };
}

export const companySurvivalStudy: Study = {
  id: "company-survival",
  question: "Of the companies incorporated each year, how many are still active, and how quickly do the rest dissolve?",
  cadence: "half",
  periods: (now) => settledHalves(now, 1),
  slugFor,
  collect,
  render,
  check,
};
