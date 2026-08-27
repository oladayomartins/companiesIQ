// ============================================================
// Lens intelligence — the same company, scored for the question the USER is
// actually asking. A bank, a solicitor, an accountant and an agency all look
// at one Companies House record and need different verdicts from it.
//
// Six models re-weight one shared pool of evidence:
//
//   digital     · agencies, SaaS, IT      → growth + reachability, absence of
//                                           digital presence reads as opportunity
//   banking     · banking, lending, cards → absence of adverse records
//   legal       · legal, KYC              → filing timeliness + governance
//   insurance   · broking, fleet          → classifiable, sizeable exposure
//   accountancy · accountants, bookkeepers→ filing need + no agent on record
//   general     · everyone else           → balanced commercial fit
//
// Key property: the SAME absent datum flips meaning by lens. No website is an
// opportunity to an agency; no filed accounts is a thin file to a bank; no
// agent on record is a warm lead to an accountant.
//
// Every row carries its own weight, state and reason, and rows we cannot
// measure are marked `measured: false` and EXCLUDED from the score rather than
// guessed — the missing weight shows up as lower confidence instead. Pure and
// client-safe (no server-only imports) so the profile UI can call it directly.
// ============================================================
import type { Company, Filing, Charge, PSC, Officer } from "@/lib/types";
import type { IntelligenceReport } from "@/lib/analytics";
import type { CompanyEnrichment } from "@/lib/enrichment/types";

export type LensKey = "digital" | "banking" | "legal" | "insurance" | "accountancy" | "general";
export type Tone = "good" | "watch" | "risk" | "muted";
export type Band = "low" | "moderate" | "strong";

/** One weighted line of the score. `pct` drives the bar; `invert` marks a drag. */
export interface LedgerRow {
  label: string;
  weight: number; // % of the model
  pct: number; // 0..100 — what the bar shows
  state: string; // "Strong", "None yet", "Not checked"
  tone: Tone;
  invert?: boolean; // higher pct = worse (competitive intensity, sector risk)
  measured: boolean; // false → excluded from the score, shown as "not checked"
  reason: string; // the audit line behind the number
}

export interface LensScore {
  lens: LensKey;
  score: number;
  band: Band;
  verdict: string;
  sub: string;
  ledger: LedgerRow[];
  why: string;
  coverage: number; // % of model weight actually measured
  confidence: "low" | "medium" | "high";
}

// ---- Lens + profile catalogue ----------------------------------------------

export interface LensMeta {
  key: LensKey;
  label: string; // "Digital & marketing"
  short: string; // "Digital" — column headers, fingerprint cell
  tab: string; // the use-case tab label
  tabTitle: string; // "Digital footprint · evidence"
  question: string; // what the tab answers
  desc: string; // one line, shown in the picker
}

export const LENSES: Record<LensKey, LensMeta> = {
  digital: {
    key: "digital",
    label: "Digital & marketing",
    short: "Digital",
    tab: "Digital",
    tabTitle: "Digital footprint · evidence",
    question: "What does this company's digital presence look like, and what is actually evidenced?",
    desc: "Weights market growth and reachability. For agencies, SaaS and IT sellers.",
  },
  banking: {
    key: "banking",
    label: "Banking & finance",
    short: "Credit",
    tab: "Credit & exposure",
    tabTitle: "Credit & exposure · evidence",
    question: "What does the public register show about creditworthiness and security — and what is missing?",
    desc: "Weights absence of adverse records, trading history and filed accounts.",
  },
  legal: {
    key: "legal",
    label: "Legal & compliance",
    short: "Legal",
    tab: "Compliance & legal",
    tabTitle: "Compliance & legal · evidence",
    question: "Is this company filing on time, and is its ownership properly disclosed?",
    desc: "Weights filing timeliness, register standing and governance disclosure.",
  },
  insurance: {
    key: "insurance",
    label: "Insurance",
    short: "Risk",
    tab: "Risk & exposure",
    tabTitle: "Risk & exposure · evidence",
    question: "Can this company's exposure be classified and sized from public data?",
    desc: "Weights trade classification, premises and asset disclosure.",
  },
  accountancy: {
    key: "accountancy",
    label: "Accountancy",
    short: "Filing",
    tab: "Filing & service need",
    tabTitle: "Filing & service need · evidence",
    question: "What does this company have to file, when — and is anyone already doing it?",
    desc: "Weights immediate filing need, deadlines and whether an agent is on record.",
  },
  general: {
    key: "general",
    label: "General opportunity",
    short: "Overall",
    tab: "Commercial fit",
    tabTitle: "Commercial fit · evidence",
    question: "Is this a live, reachable business in a market worth being in?",
    desc: "A balanced model. Nothing weighted toward a specific service.",
  },
};

export const LENS_ORDER: LensKey[] = ["general", "digital", "banking", "legal", "insurance", "accountancy"];

/** What the user sells → which model answers their question. */
export interface Profile {
  key: string;
  label: string;
  lens: LensKey;
  group: string;
}

export const PROFILES: Profile[] = [
  { key: "banking_current", label: "Business banking", lens: "banking", group: "Financial services" },
  { key: "lending", label: "Commercial lending & asset finance", lens: "banking", group: "Financial services" },
  { key: "payments", label: "Payments & merchant services", lens: "banking", group: "Financial services" },
  { key: "insurance_broking", label: "Insurance & broking", lens: "insurance", group: "Financial services" },
  { key: "accountancy", label: "Accountancy & bookkeeping", lens: "accountancy", group: "Professional services" },
  { key: "legal", label: "Legal & corporate services", lens: "legal", group: "Professional services" },
  { key: "kyc", label: "KYC, onboarding & due diligence", lens: "legal", group: "Professional services" },
  { key: "recruitment", label: "Recruitment & staffing", lens: "general", group: "Professional services" },
  { key: "consulting", label: "Consulting & advisory", lens: "general", group: "Professional services" },
  { key: "web_agency", label: "Web & digital marketing agency", lens: "digital", group: "Digital & technology" },
  { key: "saas", label: "SaaS & software sales", lens: "digital", group: "Digital & technology" },
  { key: "it_telecoms", label: "IT support & telecoms", lens: "digital", group: "Digital & technology" },
  { key: "property", label: "Commercial property & leasing", lens: "general", group: "Physical & trade" },
  { key: "fleet", label: "Logistics, fleet & vehicles", lens: "insurance", group: "Physical & trade" },
  { key: "energy", label: "Energy & utilities brokerage", lens: "general", group: "Physical & trade" },
  { key: "supplies", label: "Equipment, stock & office supplies", lens: "general", group: "Physical & trade" },
  { key: "other", label: "Other — not listed", lens: "general", group: "Other" },
];

export const PROFILE_BY_KEY: Record<string, Profile> = Object.fromEntries(PROFILES.map((p) => [p.key, p]));
export const DEFAULT_PROFILE = "other";

export function lensForProfile(profileKey: string | null | undefined): LensKey {
  return PROFILE_BY_KEY[profileKey ?? ""]?.lens ?? "general";
}

// ---- Shared evidence pool ---------------------------------------------------

const DAY = 86_400_000;

export interface LensInput {
  company: Company;
  officers: Officer[];
  filings: Filing[];
  charges: Charge[];
  pscs: PSC[];
  report: IntelligenceReport;
  enrichment: CompanyEnrichment | null;
}

function ageDays(c: Company): number | null {
  if (!c.incorporated) return null;
  const t = Date.parse(c.incorporated);
  return Number.isFinite(t) ? Math.floor((Date.now() - t) / DAY) : null;
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.round((t - Date.now()) / DAY) : null;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const isActive = (s?: string) => (s ?? "").toLowerCase() === "active";
const isDistressed = (s?: string) => ["liquidation", "administration", "receivership", "insolvency-proceedings"].includes((s ?? "").toLowerCase());

/** Human age: "3 months", "4 yrs". */
export function shortAge(days: number | null): string {
  if (days == null) return "unknown";
  if (days < 31) return `${Math.max(days, 0)} days`;
  const m = Math.floor(days / 30.44);
  if (m < 12) return `${m} month${m === 1 ? "" : "s"}`;
  const y = Math.floor(days / 365.25);
  return `${y} yr${y === 1 ? "" : "s"}`;
}

const notChecked = (label: string, weight: number, reason: string): LedgerRow => ({
  label,
  weight,
  pct: 0,
  state: "Not checked",
  tone: "muted",
  measured: false,
  reason,
});

// Each signal is computed once and reused across every lens that wants it.
interface Signals {
  marketGrowth: LedgerRow;
  registerStanding: LedgerRow;
  competitiveIntensity: LedgerRow;
  companyMaturity: LedgerRow;
  tradingHistory: LedgerRow;
  digitalPresence: LedgerRow;
  reachability: LedgerRow;
  companyActivity: LedgerRow;
  charges: LedgerRow;
  insolvency: LedgerRow;
  filedAccounts: LedgerRow;
  filingTimeliness: LedgerRow;
  litigation: LedgerRow;
  governance: LedgerRow;
  tradeClass: LedgerRow;
  claims: LedgerRow;
  sectorRisk: LedgerRow;
  premises: LedgerRow;
  assetDisclosure: LedgerRow;
  filingNeed: LedgerRow;
  agentOnRecord: LedgerRow;
  deadline: LedgerRow;
  vat: LedgerRow;
  ledgerComplexity: LedgerRow;
}

// SIC prefixes whose sector carries materially higher physical/liability
// exposure. Coarse and clearly modelled — surfaced as "modelled from SIC".
const HIGH_RISK_SIC = /^(41|42|43|45|46|47|49|50|51|52|53|55|56|10|11|13|14|15|16|17|18|20|21|22|23|24|25|28|33|38|81|86|87|88)/;
// Generic / unclassified SIC codes — the register's "we don't really know".
const VAGUE_SIC = new Set(["74990", "82990", "70229", "99999", "96090", "64209"]);

function buildSignals(input: LensInput): Signals {
  const { company: c, officers, filings, charges, pscs, report, enrichment } = input;
  const days = ageDays(c);
  const years = days == null ? null : days / 365.25;
  const activeDirectors = officers.filter((o) => o.status !== "resigned").length;
  const activePscs = pscs.filter((p) => p.active).length;
  const accountsDue = daysUntil(c.accounts?.nextDue);
  const csDue = daysUntil(c.confirmationStatement?.nextDue);
  const overdue = !!c.accounts?.overdue || !!c.confirmationStatement?.overdue;
  const hasFiledAccounts = !!c.accounts?.lastMadeUpTo || filings.some((f) => f.type === "AA");
  const recentFilings = filings.filter((f) => (daysUntil(f.date) ?? -9999) > -365).length;

  // --- market ---------------------------------------------------------------
  const growth = report.industry.annualGrowth;
  const marketGrowth: LedgerRow = {
    label: "Market growth",
    weight: 0,
    pct: clamp(50 + growth * 8),
    state: growth >= 3 ? "Strong" : growth >= 1 ? "Steady" : growth >= 0 ? "Flat" : "Declining",
    tone: growth >= 1 ? "good" : growth >= 0 ? "watch" : "risk",
    measured: true,
    reason: `${report.industry.sector} formations ${growth >= 0 ? "up" : "down"} ${Math.abs(growth).toFixed(1)}% a year nationally.`,
  };

  const density = report.local.density;
  const densityPct = density === "Very high" ? 92 : density === "High" ? 76 : density === "Moderate" ? 52 : 28;
  const competitiveIntensity: LedgerRow = {
    label: "Competitive intensity",
    weight: 0,
    pct: densityPct,
    state: density,
    tone: densityPct >= 76 ? "risk" : densityPct >= 52 ? "watch" : "good",
    invert: true,
    measured: true,
    reason: `${report.local.inSameIndustry.toLocaleString("en-GB")} comparable companies in ${report.local.region}.`,
  };

  // --- register standing ----------------------------------------------------
  let standingPct = 0;
  const standingBits: string[] = [];
  if (isActive(c.status)) {
    standingPct += 45;
    standingBits.push("active on the register");
  } else if (isDistressed(c.status)) {
    standingBits.push(`status is ${c.status}`);
  }
  if (!overdue) {
    standingPct += 30;
    standingBits.push("nothing overdue");
  } else {
    standingBits.push("a filing is overdue");
  }
  if (activeDirectors > 0) {
    standingPct += 25;
    standingBits.push(`${activeDirectors} director${activeDirectors === 1 ? "" : "s"} appointed`);
  } else {
    standingBits.push("no directors on record");
  }
  const registerStanding: LedgerRow = {
    label: "Register standing",
    weight: 0,
    pct: standingPct,
    state: standingPct >= 90 ? "Clean" : standingPct >= 60 ? "Fair" : "Impaired",
    tone: standingPct >= 90 ? "good" : standingPct >= 60 ? "watch" : "risk",
    measured: true,
    reason: standingBits.join(", ") + ".",
  };

  // --- age / trading --------------------------------------------------------
  const maturityPct = years == null ? 0 : clamp((years / 8) * 100);
  const companyMaturity: LedgerRow = {
    label: "Company maturity",
    weight: 0,
    pct: maturityPct,
    state: shortAge(days),
    tone: maturityPct >= 60 ? "good" : maturityPct >= 25 ? "watch" : "watch",
    measured: days != null,
    reason: days == null ? "No incorporation date on the record." : `Incorporated ${shortAge(days)} ago; scored against an 8-year maturity curve.`,
  };
  const tradingHistory: LedgerRow = {
    ...companyMaturity,
    label: "Trading history",
    state: days != null && days < 400 ? shortAge(days) : shortAge(days),
    tone: maturityPct >= 40 ? "good" : maturityPct >= 15 ? "watch" : "risk",
    reason:
      days == null
        ? "No incorporation date on the record."
        : `${shortAge(days)} of registered history — a lender reads anything under two years as thin.`,
  };

  // --- digital (only credited when a Places lookup actually ran) -------------
  const measuredDigital = !!enrichment && enrichment.gbpPresent !== null;
  const dHits = measuredDigital
    ? [!!enrichment?.websiteUrl, !!enrichment?.gbpPresent, !!enrichment?.reviewCount, !!enrichment?.phone].filter(Boolean).length
    : 0;
  const digitalPresence: LedgerRow = measuredDigital
    ? {
        label: "Digital presence",
        weight: 0,
        pct: clamp((dHits / 4) * 100),
        state: dHits === 0 ? "None found" : dHits >= 3 ? "Established" : "Limited",
        tone: dHits >= 3 ? "good" : dHits === 0 ? "risk" : "watch",
        measured: true,
        reason: `${dHits} of 4 digital signals found (website, Google Business Profile, reviews, phone).`,
      }
    : notChecked("Digital presence", 0, "Website, Google Business Profile, reviews and phone are checked on Pro.");
  const reachability: LedgerRow = measuredDigital
    ? {
        label: "Reachability",
        weight: 0,
        pct: clamp((([!!enrichment?.phone, !!enrichment?.websiteUrl, !!enrichment?.gbpPresent].filter(Boolean).length) / 3) * 100),
        state: enrichment?.phone ? "Phone & web" : enrichment?.websiteUrl ? "Web only" : "Address only",
        tone: enrichment?.phone ? "good" : enrichment?.websiteUrl ? "watch" : "risk",
        measured: true,
        reason: "Contactability from the registered profile and Google Places.",
      }
    : {
        label: "Reachability",
        weight: 0,
        pct: 30,
        state: "Address only",
        tone: "watch",
        measured: true,
        reason: "A registered office is on file; phone and web are checked on Pro.",
      };

  // --- activity -------------------------------------------------------------
  const activityPct = clamp((isActive(c.status) ? 55 : 0) + Math.min(recentFilings, 3) * 15);
  const companyActivity: LedgerRow = {
    label: "Company activity",
    weight: 0,
    pct: activityPct,
    state: activityPct >= 70 ? "Active" : activityPct >= 40 ? "Quiet" : "Dormant-looking",
    tone: activityPct >= 70 ? "good" : activityPct >= 40 ? "watch" : "risk",
    measured: true,
    reason: `${recentFilings} filing${recentFilings === 1 ? "" : "s"} in the last 12 months; status ${c.status}.`,
  };

  // --- adverse records ------------------------------------------------------
  const outstandingCharges = charges.filter((ch) => (ch.status ?? "").toLowerCase().includes("outstanding")).length;
  const chargesRow: LedgerRow = {
    label: "Charges & security",
    weight: 0,
    pct: charges.length === 0 ? 100 : clamp(100 - outstandingCharges * 25),
    state: charges.length === 0 ? "None" : `${outstandingCharges} outstanding`,
    tone: charges.length === 0 ? "good" : outstandingCharges > 1 ? "risk" : "watch",
    measured: true,
    reason:
      charges.length === 0
        ? "No mortgages or charges registered against the company."
        : `${charges.length} charge${charges.length === 1 ? "" : "s"} registered, ${outstandingCharges} outstanding.`,
  };
  const insolvency: LedgerRow = {
    label: "Insolvency flags",
    weight: 0,
    pct: isDistressed(c.status) ? 0 : 100,
    state: isDistressed(c.status) ? c.status : "Clear",
    tone: isDistressed(c.status) ? "risk" : "good",
    measured: true,
    reason: isDistressed(c.status)
      ? `Company status is ${c.status}.`
      : "No insolvency status on the Companies House record.",
  };
  const filedAccounts: LedgerRow = {
    label: "Filed accounts",
    weight: 0,
    pct: hasFiledAccounts ? 85 : 5,
    state: hasFiledAccounts ? "On file" : "None yet",
    tone: hasFiledAccounts ? "good" : "watch",
    measured: true,
    reason: hasFiledAccounts
      ? `Accounts made up to ${c.accounts?.lastMadeUpTo ?? "a filed period"} are on the register.`
      : "No accounts filed yet — normal for a company under 21 months old.",
  };

  // --- compliance -----------------------------------------------------------
  const timelinessPct = overdue ? 20 : hasFiledAccounts || (csDue ?? 999) < 365 ? 92 : 70;
  const filingTimeliness: LedgerRow = {
    label: "Filing timeliness",
    weight: 0,
    pct: timelinessPct,
    state: overdue ? "Overdue" : timelinessPct >= 90 ? "On time" : "Nothing due yet",
    tone: overdue ? "risk" : timelinessPct >= 90 ? "good" : "watch",
    measured: true,
    reason: overdue
      ? "At least one statutory filing is past its due date."
      : "No filing is past its due date on the register.",
  };
  const litigation = notChecked(
    "Litigation found",
    0,
    "Court and Gazette notices are not yet connected to this profile."
  );
  const govPct = clamp((activePscs > 0 ? 60 : 0) + (activeDirectors > 0 ? 40 : 0));
  const governance: LedgerRow = {
    label: "Governance disclosure",
    weight: 0,
    pct: govPct,
    state: activePscs > 0 ? "Complete" : activeDirectors > 0 ? "Minimal" : "Absent",
    tone: govPct >= 90 ? "good" : govPct >= 40 ? "watch" : "risk",
    measured: true,
    reason:
      activePscs > 0
        ? `${activePscs} person${activePscs === 1 ? "" : "s"} with significant control on record.`
        : "No PSC statement filed — normal within the first 14 weeks.",
  };

  // --- exposure -------------------------------------------------------------
  const primary = c.sicCodes[0] ?? "";
  const vague = VAGUE_SIC.has(primary) || !primary;
  const tradeClass: LedgerRow = {
    label: "Trade class clarity",
    weight: 0,
    pct: vague ? 30 : c.sicCodes.length > 1 ? 70 : 84,
    state: vague ? "Generic" : "Defined",
    tone: vague ? "watch" : "good",
    measured: true,
    reason: vague
      ? `SIC ${primary || "not stated"} is a catch-all code — the actual trade cannot be read from the register.`
      : `SIC ${primary} — ${c.primaryClassification?.category ?? "classified"}.`,
  };
  const claims = notChecked("Claims history", 0, "No claims register is connected to this profile.");
  const riskyTrade = HIGH_RISK_SIC.test(primary);
  const sectorRisk: LedgerRow = {
    label: "Sector risk",
    weight: 0,
    pct: riskyTrade ? 70 : 35,
    state: riskyTrade ? "Elevated" : "Standard",
    tone: riskyTrade ? "watch" : "good",
    invert: true,
    measured: true,
    reason: `Modelled from SIC ${primary || "—"}: ${riskyTrade ? "a trade with physical or liability exposure" : "no elevated physical exposure indicated"}.`,
  };
  const premises: LedgerRow = {
    label: "Premises identified",
    weight: 0,
    pct: c.address?.postcode ? 40 : 10,
    state: c.address?.postcode ? "Registered office only" : "None on file",
    tone: c.address?.postcode ? "watch" : "risk",
    measured: true,
    reason: "Companies House holds a registered office, which is not necessarily a trading address.",
  };
  const assetDisclosure: LedgerRow = {
    label: "Asset disclosure",
    weight: 0,
    pct: hasFiledAccounts ? 60 : charges.length ? 35 : 10,
    state: hasFiledAccounts ? "In accounts" : charges.length ? "Charges only" : "None",
    tone: hasFiledAccounts ? "good" : "risk",
    measured: true,
    reason: hasFiledAccounts
      ? "Filed accounts disclose a balance sheet to size exposure against."
      : "Nothing public discloses assets — exposure cannot be sized from the register.",
  };

  // --- service need ---------------------------------------------------------
  const soonest = [accountsDue, csDue].filter((d): d is number => d != null).sort((a, b) => a - b)[0] ?? null;
  const needPct = overdue ? 95 : soonest == null ? 40 : soonest <= 60 ? 88 : soonest <= 180 ? 62 : 45;
  const filingNeed: LedgerRow = {
    label: "Filing need",
    weight: 0,
    pct: needPct,
    state: overdue ? "Overdue" : soonest != null && soonest <= 60 ? "Immediate" : soonest != null ? "Scheduled" : "Unknown",
    tone: needPct >= 80 ? "good" : "watch",
    measured: true,
    reason: overdue
      ? "A statutory filing is already overdue — the strongest possible service signal."
      : soonest != null
        ? `Next statutory deadline in ${soonest} days.`
        : "No filing dates published yet.",
  };
  const agentOnRecord = notChecked(
    "Agent on record",
    0,
    "Whether an accountant already files for this company is not published by Companies House."
  );
  const deadline: LedgerRow = {
    label: "Deadline proximity",
    weight: 0,
    pct: soonest == null ? 30 : clamp(100 - Math.min(soonest, 365) / 3.65),
    state: soonest == null ? "Unknown" : `${soonest} days`,
    tone: soonest != null && soonest <= 60 ? "good" : "watch",
    measured: soonest != null,
    reason: soonest == null ? "No due dates on the register yet." : `Soonest statutory deadline is ${soonest} days away.`,
  };
  const vat = notChecked("VAT registration", 0, "HMRC VAT status is not connected to this profile.");
  const complexity = activeDirectors + activePscs + charges.length;
  const ledgerComplexity: LedgerRow = {
    label: "Ledger complexity",
    weight: 0,
    pct: clamp(20 + complexity * 12),
    state: complexity <= 2 ? "Simple" : complexity <= 5 ? "Moderate" : "Complex",
    tone: "watch",
    measured: true,
    reason: `${activeDirectors} director${activeDirectors === 1 ? "" : "s"}, ${activePscs} PSC${activePscs === 1 ? "" : "s"}, ${charges.length} charge${charges.length === 1 ? "" : "s"}.`,
  };

  return {
    marketGrowth,
    registerStanding,
    competitiveIntensity,
    companyMaturity,
    tradingHistory,
    digitalPresence,
    reachability,
    companyActivity,
    charges: chargesRow,
    insolvency,
    filedAccounts,
    filingTimeliness,
    litigation,
    governance,
    tradeClass,
    claims,
    sectorRisk,
    premises,
    assetDisclosure,
    filingNeed,
    agentOnRecord,
    deadline,
    vat,
    ledgerComplexity,
  };
}

// ---- The six models ---------------------------------------------------------

type Weighted = [keyof Signals, number];

const MODELS: Record<LensKey, { rows: Weighted[]; why: string }> = {
  digital: {
    rows: [
      ["marketGrowth", 30],
      ["registerStanding", 25],
      ["competitiveIntensity", 20],
      ["companyMaturity", 15],
      ["digitalPresence", 10],
    ],
    why: "Market growth (30%) and register standing (25%) lift the score; competitive intensity (20%) and maturity (15%) suppress it. Digital presence (10%) is scored on absence of evidence, not confirmed absence.",
  },
  banking: {
    rows: [
      ["registerStanding", 20],
      ["charges", 20],
      ["insolvency", 15],
      ["tradingHistory", 25],
      ["filedAccounts", 20],
    ],
    why: "Absence of adverse records — register standing, charges and insolvency flags — carries 55% of the weight. Trading history (25%) and filed accounts (20%) are unscoreable on a young company, which caps the score in the middle band.",
  },
  legal: {
    rows: [
      ["filingTimeliness", 30],
      ["litigation", 25],
      ["registerStanding", 20],
      ["charges", 5],
      ["governance", 20],
    ],
    why: "Filing timeliness (30%), absence of litigation (25%) and clean register standing (20%) dominate. Governance disclosure (20%) reads the PSC register; charges (5%) are a minor signal here.",
  },
  insurance: {
    rows: [
      ["tradeClass", 35],
      ["claims", 20],
      ["sectorRisk", 10],
      ["premises", 15],
      ["assetDisclosure", 20],
    ],
    why: "Trade classification (35%) decides whether exposure can be categorised at all. Claims history (20%), asset disclosure (20%) and premises (15%) size it; sector risk (10%) suppresses. Empty rows mean exposure cannot be sized from public data.",
  },
  accountancy: {
    rows: [
      ["filingNeed", 35],
      ["agentOnRecord", 25],
      ["deadline", 20],
      ["vat", 5],
      ["ledgerComplexity", 15],
    ],
    why: "Immediate filing need (35%) and no agent on record (25%) are the demand signals that drive this model. Deadline proximity (20%) and ledger complexity (15%) moderate it.",
  },
  general: {
    rows: [
      ["marketGrowth", 25],
      ["companyActivity", 25],
      ["reachability", 20],
      ["competitiveIntensity", 15],
      ["companyMaturity", 15],
    ],
    why: "A balanced model: market growth (25%), company activity (25%), reachability (20%), competition (15%) and maturity (15%). Nothing is weighted toward a specific service, so the score reads as general commercial fit.",
  },
};

// Verdict language differs per lens — a solicitor is not shopping for
// "opportunity", and a broker is not shopping for a "lead".
const VERDICTS: Record<LensKey, Record<Band, [string, string]>> = {
  digital: {
    low: ["Low opportunity", "Little to work with on current evidence"],
    moderate: ["Moderate opportunity", "Worth monitoring, not yet worth pursuing"],
    strong: ["Strong opportunity", "A live prospect on current evidence"],
  },
  banking: {
    low: ["Adverse records present", "The register shows something to price in"],
    moderate: ["Thin file, low exposure", "Nothing adverse, but little history to lend against"],
    strong: ["Established, clean file", "Trading history and a clean register"],
  },
  legal: {
    low: ["Compliance concerns", "Filings or disclosure are behind"],
    moderate: ["Partial disclosure", "Filing on time, but ownership is not fully disclosed"],
    strong: ["Clean compliance record", "Filed on time with ownership disclosed"],
  },
  insurance: {
    low: ["Unquantified exposure", "Public data cannot size this risk"],
    moderate: ["Partly classifiable", "The trade is clear; the assets are not"],
    strong: ["Classifiable exposure", "Trade, premises and assets are all readable"],
  },
  accountancy: {
    low: ["Low service need", "Nothing due and nothing outstanding"],
    moderate: ["Service need building", "Deadlines approaching but not imminent"],
    strong: ["High service need", "Statutory work is due and no agent is evident"],
  },
  general: {
    low: ["Limited commercial fit", "Quiet on the register and hard to reach"],
    moderate: ["Early but active", "A live business, still light on evidence"],
    strong: ["Strong commercial fit", "Active, reachable and in a growing market"],
  },
};

function bandOf(score: number): Band {
  return score >= 67 ? "strong" : score >= 34 ? "moderate" : "low";
}

/** Score one company through one lens. */
export function scoreLens(input: LensInput, lens: LensKey): LensScore {
  const signals = buildSignals(input);
  const model = MODELS[lens];

  const ledger: LedgerRow[] = model.rows.map(([key, weight]) => ({ ...signals[key], weight }));

  let weighted = 0;
  let measuredWeight = 0;
  for (const row of ledger) {
    if (!row.measured) continue;
    measuredWeight += row.weight;
    weighted += (row.invert ? 100 - row.pct : row.pct) * row.weight;
  }
  const score = measuredWeight === 0 ? 0 : clamp(weighted / measuredWeight);
  const coverage = Math.round(measuredWeight);
  const band = bandOf(score);
  const [verdict, sub] = VERDICTS[lens][band];

  return {
    lens,
    score,
    band,
    verdict,
    sub,
    ledger,
    why: model.why,
    coverage,
    confidence: coverage >= 85 ? "high" : coverage >= 60 ? "medium" : "low",
  };
}

/** Every lens at once — powers the fingerprint strip and the "same company, different question" comparison. */
export function scoreAllLenses(input: LensInput): Record<LensKey, LensScore> {
  return Object.fromEntries(LENS_ORDER.map((k) => [k, scoreLens(input, k)])) as Record<LensKey, LensScore>;
}

// ---- Peers ------------------------------------------------------------------

/**
 * A coarse score for a peer company. Deliberately NOT the full model: the peer
 * list carries register basics only (status + incorporation), so anything more
 * would be invented. Used for the comparables table and the distribution strip,
 * both of which say so on the page.
 */
export function scorePeerLite(peer: { status: string; incorporated?: string }, lens: LensKey): { score: number; signal: string } {
  const days = peer.incorporated ? Math.floor((Date.now() - Date.parse(peer.incorporated)) / DAY) : null;
  const years = days == null ? null : days / 365.25;
  const active = isActive(peer.status);
  const maturity = years == null ? 0 : clamp((years / 8) * 100);

  // Each lens reads the same two facts differently: an accountant wants the
  // young ones, a lender wants the seasoned ones.
  let score: number;
  let signal: string;
  switch (lens) {
    case "accountancy":
      score = clamp((active ? 55 : 10) + (100 - maturity) * 0.45);
      signal = years != null && years < 2 ? "Early filings due" : "Established ledger";
      break;
    case "banking":
      score = clamp((active ? 45 : 5) + maturity * 0.55);
      signal = years != null && years >= 3 ? "Trading history" : "Thin file";
      break;
    case "digital":
      score = clamp((active ? 50 : 10) + (100 - maturity) * 0.4);
      signal = years != null && years < 3 ? "Likely unclaimed" : "Likely established";
      break;
    case "insurance":
      score = clamp((active ? 55 : 10) + maturity * 0.45);
      signal = active ? "Classifiable" : "Inactive";
      break;
    case "legal":
      score = clamp((active ? 65 : 10) + maturity * 0.35);
      signal = active ? "On the register" : peer.status;
      break;
    default:
      score = clamp((active ? 55 : 10) + maturity * 0.45);
      signal = active ? "Active" : peer.status;
  }
  return { score, signal };
}

/** Bucket peer scores into the 8 bands the distribution strip draws. */
export const PEER_BUCKETS = ["0–20", "21–30", "31–40", "41–50", "51–60", "61–70", "71–80", "81+"];

export function bucketIndex(score: number): number {
  if (score <= 20) return 0;
  if (score <= 30) return 1;
  if (score <= 40) return 2;
  if (score <= 50) return 3;
  if (score <= 60) return 4;
  if (score <= 70) return 5;
  if (score <= 80) return 6;
  return 7;
}
