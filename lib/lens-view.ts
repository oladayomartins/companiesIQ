// ============================================================
// Lens narrative — what the scored evidence MEANS for the lens the user picked.
//
// Everything here is derived from the same evidence pool as the score, so the
// prose can never disagree with the ledger. Deterministic by design: this is a
// crawlable page, so there is no per-render model call and nothing that could
// hallucinate a fact the register doesn't hold. The shape matches what an LLM
// brief would return, so swapping in a cached Haiku brief later is a drop-in.
// ============================================================
import type { LensInput, LensKey, LensScore, Tone } from "@/lib/lens";
import { LENSES, shortAge } from "@/lib/lens";
import { fmtDate } from "@/lib/format";
import { slugify } from "@/lib/slug";

export interface BriefPoint {
  n: string;
  title: string;
  text: string;
  tone: Tone;
}
export interface Brief {
  prose: string;
  points: BriefPoint[];
}

export interface EvidenceRow {
  title: string;
  sub: string;
  state: string;
  tone: Tone;
}

export interface NextAction {
  n: string;
  label: string;
  cta: string;
  href: string;
}

export interface LensCard {
  label: string;
  flag: string;
  flagTone: Tone;
  headline: string;
  rows: { k: string; v: string }[];
  note: string;
  cta: { label: string; href: string };
  source: string;
}

const DAY = 86_400_000;
const daysUntil = (iso?: string): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.round((t - Date.now()) / DAY) : null;
};
const ageDays = (iso?: string): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor((Date.now() - t) / DAY) : null;
};
const num = (n: number) => n.toLocaleString("en-GB");
const pc = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

/** Pull a row out of a scored ledger by label. */
function row(score: LensScore, label: string) {
  return score.ledger.find((r) => r.label === label);
}

// ---- The brief --------------------------------------------------------------

export function buildBrief(input: LensInput, score: LensScore): Brief {
  const { company: c, report } = input;
  const lens = LENSES[score.lens];
  const age = ageDays(c.incorporated);
  const sector = report.industry.sector.toLowerCase();
  const region = report.local.region;
  const growth = report.industry.annualGrowth;
  const regionalAhead = report.regional.regionalGrowth > report.regional.nationalGrowth;

  const stage = age == null ? "a company" : age < 400 ? "An early-stage" : age < 1825 ? "An established" : "A long-standing";
  const prose =
    `${stage} ${sector} business in ${region}, ` +
    `in a market ${growth >= 0 ? "growing" : "contracting"} ${Math.abs(growth).toFixed(1)}% a year` +
    `${regionalAhead ? " and growing faster here than nationally" : " and tracking below the national rate here"}. ` +
    briefTail(input, score);

  return { prose, points: buildPoints(input, score) };
}

function briefTail(input: LensInput, score: LensScore): string {
  const unmeasured = score.ledger.filter((r) => !r.measured).length;
  switch (score.lens) {
    case "digital": {
      const d = row(score, "Digital presence");
      if (d && !d.measured) return "Digital signals have not been checked on this profile, so the score leans on market and register evidence alone.";
      return d && d.pct < 50
        ? "Most digital signals are absent — for an agency that reads as unclaimed territory rather than a warning."
        : "The digital footprint is already established, so the opening is service quality rather than presence.";
    }
    case "banking":
      return (row(score, "Filed accounts")?.pct ?? 0) > 50
        ? "There is a filed balance sheet to underwrite against and nothing adverse on the register."
        : "Nothing adverse is on the register, but there are no filed accounts to underwrite against yet.";
    case "legal":
      return row(score, "Governance disclosure")?.state === "Complete"
        ? "Ownership is disclosed and filings are current."
        : "Filings are current, but ownership is not yet fully disclosed on the PSC register.";
    case "insurance":
      return row(score, "Trade class clarity")?.state === "Defined"
        ? "The trade is classifiable, but nothing public discloses assets, so exposure cannot be sized from the register alone."
        : "The registered trade is a catch-all code, so exposure cannot be categorised from public data.";
    case "accountancy":
      return (row(score, "Filing need")?.pct ?? 0) >= 80
        ? "Statutory work is due and nothing indicates an agent is already on record."
        : "Deadlines are still some way out, so this is a pipeline entry rather than an immediate approach.";
    default:
      return unmeasured
        ? "Some signals are unchecked on this profile, so treat the score as indicative."
        : "Every signal in the model was measurable for this company.";
  }
}

function buildPoints(input: LensInput, score: LensScore): BriefPoint[] {
  const { report } = input;
  const out: BriefPoint[] = [];
  const growth = report.industry.annualGrowth;
  const regionalAhead = report.regional.regionalGrowth > report.regional.nationalGrowth;

  out.push({
    n: "01",
    title: growth >= 0 ? "Market opportunity" : "Market headwind",
    text: `Sector ${growth >= 0 ? "up" : "down"} ${Math.abs(growth).toFixed(1)}% nationally, ${pc(report.regional.regionalGrowth)} in ${report.local.region}${regionalAhead ? " — a regional tailwind" : ""}.`,
    tone: growth >= 1 ? "good" : growth >= 0 ? "watch" : "risk",
  });

  // The second point is the lens's own headline weakness — but never the
  // competition row, because point 03 below is always about competition and two
  // paraphrases of one fact read as padding.
  const measured = score.ledger.filter((r) => r.measured && !/competit/i.test(r.label));
  const weakest = [...measured].sort((a, b) => (a.invert ? 100 - a.pct : a.pct) - (b.invert ? 100 - b.pct : b.pct))[0];
  if (weakest) {
    out.push({
      n: "02",
      title: gapTitle(score.lens, weakest.label),
      text: weakest.reason,
      tone: weakest.tone === "good" ? "good" : "watch",
    });
  }

  out.push({
    n: "03",
    title: "Competitive risk",
    text: `${num(report.local.inSameIndustry)} comparable companies in ${report.local.region}; five-year survival across the sector is ${report.survival.fiveYear.toFixed(1)}%.`,
    tone: report.local.density === "Very high" || report.local.density === "High" ? "risk" : "watch",
  });

  return out;
}

// Only the lens's signature dimension earns a headline of its own — renaming
// whatever happens to score lowest produces non-sequiturs like
// "Service trigger: 1 director, 1 PSC, 0 charges".
const GAP_TITLES: Partial<Record<LensKey, Record<string, string>>> = {
  digital: { "Digital presence": "Digital gap" },
  banking: { "Filed accounts": "Underwriting gap", "Trading history": "Thin file" },
  legal: { "Governance disclosure": "Disclosure gap" },
  insurance: { "Asset disclosure": "Exposure gap", "Trade class clarity": "Classification gap" },
  accountancy: { "Filing need": "Service trigger", "Deadline proximity": "Deadline" },
};

function gapTitle(lens: LensKey, label: string): string {
  return GAP_TITLES[lens]?.[label] ?? label;
}

// ---- The lens tab: what is actually evidenced -------------------------------

export function buildEvidence(input: LensInput, score: LensScore): EvidenceRow[] {
  return score.ledger.map((r) => ({
    title: r.label,
    sub: r.reason,
    state: r.measured ? r.state : "Not checked",
    tone: r.measured ? r.tone : "muted",
  }));
}

/** Which providers this company's evidence is commonly relevant to, from THIS lens. */
export function relevantTo(input: LensInput, lens: LensKey): string[] {
  const { company: c, charges, pscs } = input;
  const age = ageDays(c.incorporated);
  const young = age != null && age < 550;
  const out: string[] = [];
  switch (lens) {
    case "digital":
      out.push("Web & brand", "Local SEO", "Paid acquisition", "CRM & automation");
      break;
    case "banking":
      out.push("Business current account", young ? "Startup lending" : "Working capital", "Merchant acquiring");
      if (charges.length) out.push("Refinancing");
      break;
    case "legal":
      out.push("Company secretarial", "PSC & register maintenance", "Contract templates");
      if (!pscs.filter((p) => p.active).length) out.push("Beneficial-ownership review");
      break;
    case "insurance":
      out.push("Employers' liability", "Public liability", "Professional indemnity");
      if (/^(49|50|51|52)/.test(c.sicCodes[0] ?? "")) out.push("Fleet & goods in transit");
      break;
    case "accountancy":
      out.push("Statutory accounts", "Confirmation statement", "Bookkeeping", young ? "First-year setup" : "Tax planning");
      break;
    default:
      out.push("Business banking", "Insurance", "Accountancy", "IT & telecoms");
  }
  return out;
}

// ---- Recommended next steps -------------------------------------------------

export function buildActions(input: LensInput, score: LensScore, opts: { unlocked: boolean }): NextAction[] {
  const { company: c, report } = input;
  const sectorHref = c.primaryClassification?.sector ? `/industry/${slugify(c.primaryClassification.sector)}` : "/app/industries";
  const regionHref = c.geo?.region && c.geo.region !== "Unknown" ? `/market/${slugify(c.geo.region)}` : "/app/markets";
  const out: NextAction[] = [];
  const push = (label: string, cta: string, href: string) => out.push({ n: String(out.length + 1).padStart(2, "0"), label, cta, href });

  const soonest = [daysUntil(c.accounts?.nextDue), daysUntil(c.confirmationStatement?.nextDue)]
    .filter((d): d is number => d != null)
    .sort((a, b) => a - b)[0];

  switch (score.lens) {
    case "digital":
      push("No confirmed website or Google Business Profile on this record", "Run a digital check", opts.unlocked ? "/app/enrich" : "/pricing");
      push(`Track new ${report.industry.sector.toLowerCase()} registrations in ${report.local.region}`, "Set a sector alert", "/app/alerts");
      break;
    case "banking":
      push("No filed accounts to underwrite against yet", "Watch for first accounts", "/app/alerts");
      push("Nothing adverse on the register today", "Monitor for charges", "/app/alerts");
      break;
    case "legal":
      push("Confirm the PSC position before onboarding", "Open the register record", "#records");
      push("Filing dates are the cheapest compliance tripwire", "Set a filing alert", "/app/alerts");
      break;
    case "insurance":
      push("Exposure cannot be sized from public data alone", "Review the evidence", "#lens");
      push("Trade class is the strongest public signal here", "Compare sector peers", "#competitors");
      break;
    case "accountancy":
      push(
        soonest != null ? `Next statutory deadline in ${soonest} days` : "No published deadlines yet",
        "Set a filing alert",
        "/app/alerts"
      );
      push("No evidence of an agent already on record", "Add to prospect list", opts.unlocked ? "/app/prospects" : "/pricing");
      break;
    default:
      push("Keep this company on the radar", "Add to a watchlist", opts.unlocked ? "/app/watchlists" : "/pricing");
      push(`See how ${report.local.region} compares`, "Open the market", regionHref);
  }
  push(`Build a list from ${num(report.local.inSameIndustry)} comparable companies`, "Open the sector", sectorHref);
  return out;
}

// ---- The lens-specific intelligence card ------------------------------------

export function buildLensCard(input: LensInput, score: LensScore): LensCard {
  const { company: c, charges, pscs, officers, report } = input;
  const lens = LENSES[score.lens];
  const age = ageDays(c.incorporated);
  const accountsDue = c.accounts?.nextDue;
  const csDue = c.confirmationStatement?.nextDue;
  const activePscs = pscs.filter((p) => p.active).length;
  const activeDirectors = officers.filter((o) => o.status !== "resigned").length;

  const base = {
    label: lens.label,
    cta: { label: `Open ${lens.tab.toLowerCase()}`, href: "#lens" },
  };

  switch (score.lens) {
    case "digital": {
      const d = row(score, "Digital presence");
      return {
        ...base,
        label: "Digital opportunity",
        flag: d?.measured ? (d.pct < 50 ? "Unclaimed" : "Established") : "Not checked",
        flagTone: d?.measured ? (d.pct < 50 ? "good" : "watch") : "muted",
        headline: d?.measured ? `${Math.round((d.pct / 100) * 4)} of 4 signals` : "Not checked",
        rows: [
          { k: "Website", v: input.enrichment?.websiteUrl ? "Found" : d?.measured ? "None found" : "Not checked" },
          { k: "Google Business Profile", v: input.enrichment?.gbpPresent ? "Found" : d?.measured ? "None found" : "Not checked" },
          { k: "Reviews", v: input.enrichment?.reviewCount ? `${input.enrichment.reviewCount}` : d?.measured ? "None found" : "Not checked" },
          { k: "Public phone", v: input.enrichment?.phone ? "Found" : d?.measured ? "None found" : "Not checked" },
        ],
        note: d?.measured
          ? "Absence of evidence is not confirmed absence — it means nothing was found at the registered identity."
          : "Digital presence is measured with a Google Places lookup on Pro, so public crawls never burn the quota.",
        source: "Google Places",
      };
    }
    case "banking":
      return {
        ...base,
        label: "Credit & exposure",
        flag: charges.length ? "Security registered" : "No security",
        flagTone: charges.length ? "watch" : "good",
        headline: charges.length ? `${charges.length} charge${charges.length === 1 ? "" : "s"}` : "Clean register",
        rows: [
          { k: "Charges registered", v: charges.length ? String(charges.length) : "None" },
          { k: "Filed accounts", v: c.accounts?.lastMadeUpTo ? fmtDate(c.accounts.lastMadeUpTo) : "None yet" },
          { k: "Trading history", v: shortAge(age) },
          { k: "Insolvency status", v: row(score, "Insolvency flags")?.state ?? "—" },
        ],
        note: "Nothing here is a credit decision — it is what the public register does and does not disclose.",
        source: "Companies House",
      };
    case "legal":
      return {
        ...base,
        label: "Compliance & legal",
        flag: c.accounts?.overdue || c.confirmationStatement?.overdue ? "Overdue" : "Current",
        flagTone: c.accounts?.overdue || c.confirmationStatement?.overdue ? "risk" : "good",
        headline: activePscs ? "Ownership disclosed" : "PSC not filed",
        rows: [
          { k: "Accounts next due", v: accountsDue ? fmtDate(accountsDue) : "—" },
          { k: "Confirmation statement", v: csDue ? fmtDate(csDue) : "—" },
          { k: "PSCs on record", v: activePscs ? String(activePscs) : "None" },
          { k: "Directors", v: String(activeDirectors) },
        ],
        note: "A missing PSC statement is normal within 14 weeks of incorporation — after that it is a disclosure gap.",
        source: "Companies House",
      };
    case "insurance":
      return {
        ...base,
        label: "Risk & exposure",
        flag: row(score, "Sector risk")?.state ?? "Standard",
        flagTone: row(score, "Sector risk")?.state === "Elevated" ? "watch" : "good",
        headline: row(score, "Trade class clarity")?.state === "Defined" ? "Trade classifiable" : "Trade generic",
        rows: [
          { k: "SIC code", v: c.sicCodes[0] ?? "—" },
          { k: "Trade", v: c.primaryClassification?.category ?? "—" },
          { k: "Premises", v: c.address?.postcode ? "Registered office" : "None on file" },
          { k: "Asset disclosure", v: row(score, "Asset disclosure")?.state ?? "—" },
        ],
        note: "A registered office is not a trading address. Sizing exposure needs evidence the register does not hold.",
        source: "Companies House · SIC",
      };
    case "accountancy": {
      const soonest = [daysUntil(accountsDue), daysUntil(csDue)].filter((d): d is number => d != null).sort((a, b) => a - b)[0];
      return {
        ...base,
        label: "Filing & service need",
        flag: c.accounts?.overdue ? "Overdue" : soonest != null && soonest <= 60 ? "Immediate" : "Scheduled",
        flagTone: c.accounts?.overdue ? "risk" : soonest != null && soonest <= 60 ? "good" : "watch",
        headline: soonest != null ? `${soonest} days` : "No dates yet",
        rows: [
          { k: "Accounts next due", v: accountsDue ? fmtDate(accountsDue) : "—" },
          { k: "Confirmation statement", v: csDue ? fmtDate(csDue) : "—" },
          { k: "Ledger complexity", v: row(score, "Ledger complexity")?.state ?? "—" },
          { k: "Agent on record", v: "Not published" },
        ],
        note: "Companies House does not publish who files on a company's behalf, so an agent can never be ruled out from the register.",
        source: "Companies House",
      };
    }
    default:
      return {
        ...base,
        label: "Commercial fit",
        flag: score.band === "strong" ? "Strong" : score.band === "moderate" ? "Moderate" : "Limited",
        flagTone: score.band === "strong" ? "good" : score.band === "moderate" ? "watch" : "risk",
        headline: `${score.score}/100`,
        rows: [
          { k: "Status", v: c.status.charAt(0).toUpperCase() + c.status.slice(1) },
          { k: "Age", v: shortAge(age) },
          { k: "Sector growth", v: pc(report.industry.annualGrowth) },
          { k: "Regional density", v: report.local.density },
        ],
        note: "A balanced read. Pick the lens that matches what you sell and every number on this page re-weights.",
        source: "Companies House · ONS",
      };
  }
}
