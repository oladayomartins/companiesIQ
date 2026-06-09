// ============================================================
// Opportunity Intelligence — turns a company record into a lead-
// qualification view. Strictly evidence-graded:
//
//   Category 1 (facts):   stated confidently, each with a source.
//                         Website / GBP / reviews / phone (Google Places),
//                         accounts & confirmation-statement status, charges,
//                         directors, PSCs, status, age (Companies House).
//   Category 2 (inferences): only ever as "commonly" / "likely relevant",
//                         never "needs". Sector norms + provider relevance.
//   Category 3 (unknowable): never asserted.
//
// Pure + client-safe (no server-only imports) so the report UI can call it.
// ============================================================
import type { Company } from "@/lib/types";
import type { CompanyEnrichment } from "@/lib/enrichment/types";

export type FactState = "detected" | "not_detected" | "not_assessed";

export interface DigitalFact {
  label: string;
  state: FactState;
  value?: string; // e.g. the URL, phone number, "28 · 4.7★"
  href?: string; // when the fact is a link (website, maps)
}

export type SignalTone = "good" | "watch" | "neutral";

export interface OppSignal {
  label: string;
  detail?: string;
  tone: SignalTone;
}

export interface OpportunityIntel {
  sector: string;
  // Category 1 — verifiable facts
  digital: { website: DigitalFact; gbp: DigitalFact; reviews: DigitalFact; phone: DigitalFact };
  digitalMeasured: boolean; // did a confident Places lookup actually run?
  digitalSource: string | null;
  compliance: OppSignal[]; // accounts, confirmation statement, charges, directors, PSCs, status, age
  signals: OppSignal[]; // the headline ✓ / ⚠ list (facts only)
  // Transparent composite of the verified signals above
  score: number; // 0..100
  scoreBasis: string[]; // one line per contributing factor (fully auditable)
  // Category 2 — cautious, clearly-labelled inferences
  commonlyInvests: string[]; // "Businesses in this sector commonly invest in:"
  relevantFor: string[]; // "Commonly relevant to these providers:"
}

const DAY = 86_400_000;

function ageYears(incorporated?: string): number | null {
  if (!incorporated) return null;
  const t = Date.parse(incorporated);
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / (365.25 * DAY);
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.round((t - Date.now()) / DAY);
}

function isActive(status: string): boolean {
  return status === "active" || status === "open";
}

// ---- Category 1: digital presence facts ------------------------------------

function digitalFacts(e: CompanyEnrichment | null): {
  facts: OpportunityIntel["digital"];
  measured: boolean;
  source: string | null;
} {
  // We assert "detected"/"not_detected" only when the Places lookup was
  // conclusive: a confident name match ("high"), or a clean no-result ("none").
  // An ambiguous match ("low") or no lookup at all → "not_assessed" (never guessed).
  const conf = e?.matchConfidence ?? null;
  const conclusive = conf === "high" || conf === "none";

  const na = (label: string): DigitalFact => ({ label, state: "not_assessed" });
  if (!e || !conclusive) {
    return {
      facts: { website: na("Website"), gbp: na("Google Business Profile"), reviews: na("Google reviews"), phone: na("Phone") },
      measured: false,
      source: e?.placesSource ?? null,
    };
  }

  const website: DigitalFact = e.websiteUrl
    ? { label: "Website", state: "detected", value: prettyUrl(e.websiteUrl), href: e.websiteUrl }
    : { label: "Website", state: "not_detected" };

  const gbp: DigitalFact = e.gbpPresent
    ? { label: "Google Business Profile", state: "detected", value: "Listed", href: e.placesSource ?? undefined }
    : { label: "Google Business Profile", state: "not_detected" };

  const reviews: DigitalFact =
    e.reviewCount != null && e.reviewCount > 0
      ? { label: "Google reviews", state: "detected", value: `${e.reviewCount}${e.reviewRating ? ` · ${e.reviewRating}★` : ""}` }
      : { label: "Google reviews", state: "not_detected", value: "0 found" };

  const phone: DigitalFact = e.phone
    ? { label: "Phone", state: "detected", value: e.phone, href: `tel:${e.phone.replace(/\s+/g, "")}` }
    : { label: "Phone", state: "not_detected" };

  return { facts: { website, gbp, reviews, phone }, measured: true, source: e.placesSource ?? null };
}

function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

// ---- Category 1: compliance / register facts -------------------------------

function complianceSignals(c: Company, counts: Counts): OppSignal[] {
  const out: OppSignal[] = [];

  // Status
  out.push(
    isActive(c.status)
      ? { label: "Active company", tone: "good" }
      : { label: `Status: ${c.status}`, tone: "watch" }
  );

  // Age
  const age = ageYears(c.incorporated);
  if (age != null) {
    const label = age < 1 ? "Incorporated under 1 year ago" : `${Math.floor(age)} year${Math.floor(age) === 1 ? "" : "s"} old`;
    out.push({ label, tone: age < 2 ? "good" : "neutral", detail: age < 2 ? "Early-stage" : undefined });
  }

  // Accounts
  if (c.accounts) {
    const d = daysUntil(c.accounts.nextDue);
    if (c.accounts.overdue) out.push({ label: "Accounts overdue", tone: "watch" });
    else if (d != null && d <= 90) out.push({ label: `Accounts due in ${d} day${d === 1 ? "" : "s"}`, tone: "watch" });
    else if (d != null) out.push({ label: "Accounts up to date", tone: "good" });
  }

  // Confirmation statement
  if (c.confirmationStatement) {
    const d = daysUntil(c.confirmationStatement.nextDue);
    if (c.confirmationStatement.overdue) out.push({ label: "Confirmation statement overdue", tone: "watch" });
    else if (d != null && d <= 30) out.push({ label: `Confirmation statement due in ${d} day${d === 1 ? "" : "s"}`, tone: "watch" });
    else if (d != null) out.push({ label: "Confirmation statement current", tone: "good" });
  }

  // Directors / PSCs / charges
  if (counts.directors > 0)
    out.push({ label: `${counts.directors} active director${counts.directors === 1 ? "" : "s"}`, tone: "neutral" });
  if (counts.pscs > 0) out.push({ label: `${counts.pscs} person${counts.pscs === 1 ? "" : "s"} with significant control`, tone: "neutral" });
  out.push(
    counts.charges > 0
      ? { label: `${counts.charges} charge${counts.charges === 1 ? "" : "s"} registered`, tone: "neutral" }
      : { label: "No charges registered", tone: "neutral" }
  );

  return out;
}

// ---- Transparent opportunity score -----------------------------------------

function scoreFrom(
  c: Company,
  counts: Counts,
  digital: OpportunityIntel["digital"],
  measured: boolean
): { score: number; basis: string[] } {
  let score = 0;
  const basis: string[] = [];
  const add = (pts: number, why: string) => {
    score += pts;
    basis.push(`${why} (+${pts})`);
  };

  if (isActive(c.status)) add(20, "Active on the register");

  const age = ageYears(c.incorporated);
  if (age != null && age < 2) add(15, "Recently incorporated — early-stage");

  // Contactability + digital establishment (only credited when measured).
  if (measured) {
    if (digital.website.state === "detected") add(15, "Website detected");
    if (digital.gbp.state === "detected") add(15, "Google Business Profile detected");
    if (digital.reviews.state === "detected") add(10, "Has Google reviews");
    if (digital.phone.state === "detected") add(10, "Public phone number");
  }

  // Compliance-need signals (relevant to accountants/advisers).
  if (c.accounts?.overdue) add(10, "Accounts overdue");
  else if ((daysUntil(c.accounts?.nextDue) ?? 999) <= 90) add(6, "Accounts due within 90 days");
  if (c.confirmationStatement?.overdue) add(5, "Confirmation statement overdue");
  else if ((daysUntil(c.confirmationStatement?.nextDue) ?? 999) <= 30) add(4, "Confirmation statement due within 30 days");

  if (counts.directors > 0) add(5, "Has appointed directors");

  return { score: Math.max(0, Math.min(100, score)), basis };
}

// ---- Category 2: cautious inferences (always labelled "commonly"/"likely") --

// Keyword → sector-typical investments. Matched against the sector + SIC
// category, lowercased. These are illustrative norms, NOT company-specific needs.
const SECTOR_INVESTMENTS: { match: RegExp; items: string[] }[] = [
  { match: /tech|software|it |information|computer|digital/, items: ["Website & web app", "Professional email", "Cloud hosting", "LinkedIn presence", "Cyber & PI insurance"] },
  { match: /construct|build|trades|plumb|electric|civil/, items: ["Vehicle graphics & workwear", "Public liability & employers' insurance", "Health & safety documentation", "Website", "Business cards"] },
  { match: /food|restaurant|cafe|catering|hospitality|hotel|accommodation/, items: ["Google Business Profile & photography", "Online menu / ordering", "Website", "Print & signage", "Food-safety & liability insurance"] },
  { match: /retail|shop|store|wholesale|ecommerce|e-commerce/, items: ["Online store", "Google Business Profile", "Payment & POS systems", "Stock insurance", "Social & paid ads"] },
  { match: /health|care|medical|dental|clinic|beauty|salon/, items: ["Website & online booking", "Google Business Profile & reviews", "Professional indemnity insurance", "Compliance documentation", "Local SEO"] },
  { match: /consult|profession|legal|account|advis|management/, items: ["Website", "Professional email & branding", "LinkedIn presence", "Proposal templates", "Professional indemnity insurance"] },
  { match: /transport|logistic|haul|courier|delivery|fleet/, items: ["Fleet & goods-in-transit insurance", "Vehicle telematics", "Vehicle graphics", "Website", "Booking / dispatch software"] },
  { match: /financ|insur|invest|fintech|account/, items: ["Website & secure portal", "Compliance & PI insurance", "CRM", "LinkedIn presence", "Content marketing"] },
  { match: /creativ|media|market|design|advertis|photograph/, items: ["Portfolio website", "Showreel & branding", "Project management tools", "PI insurance", "Social presence"] },
  { match: /property|estate|real estate|letting|construction/, items: ["Website with listings", "Google Business Profile", "Photography & virtual tours", "Professional indemnity insurance", "Local SEO"] },
];

const DEFAULT_INVESTMENTS = ["Website", "Professional email", "Google Business Profile", "Business insurance", "Accounting software"];

function commonInvestmentsFor(sector: string, category: string): string[] {
  const hay = `${sector} ${category}`.toLowerCase();
  const hit = SECTOR_INVESTMENTS.find((s) => s.match.test(hay));
  return hit ? hit.items : DEFAULT_INVESTMENTS;
}

// Which provider types commonly serve a profile like this — conservative,
// rules-based, and phrased as "commonly relevant", never "needs".
function relevantProviders(c: Company, counts: Counts, digital: OpportunityIntel["digital"], measured: boolean): string[] {
  const out = new Set<string>();
  const age = ageYears(c.incorporated);

  // Every active limited company has statutory filing obligations.
  if (isActive(c.status)) out.add("Accountants & bookkeepers");
  if (c.accounts?.overdue || (daysUntil(c.accounts?.nextDue) ?? 999) <= 90) out.add("Accountants & bookkeepers");

  // Newly incorporated → setup-stage providers.
  if (age != null && age < 1.5) {
    out.add("Business banking");
    out.add("Business insurance brokers");
  }
  // Growing sector + multiple directors → likely to scale headcount.
  if (counts.directors >= 2 && age != null && age < 4) out.add("Recruitment agencies");

  // No detected website/GBP (only when we actually measured) → web/marketing.
  if (measured && (digital.website.state === "not_detected" || digital.gbp.state === "not_detected")) {
    out.add("Marketing & web agencies");
  }
  // Always-plausible B2B services.
  out.add("IT & telecoms");

  return Array.from(out);
}

// ---- Public entry point -----------------------------------------------------

export interface Counts {
  directors: number;
  pscs: number;
  charges: number;
}

export function buildOpportunity(c: Company, counts: Counts, enrichment: CompanyEnrichment | null): OpportunityIntel {
  const sector = c.primaryClassification?.sector ?? "—";
  const category = c.primaryClassification?.category ?? "";

  const { facts, measured, source } = digitalFacts(enrichment);
  const compliance = complianceSignals(c, counts);
  const { score, basis } = scoreFrom(c, counts, facts, measured);

  // Headline signal list = the notable facts (good + watch), digital first.
  const signals: OppSignal[] = [];
  if (measured) {
    for (const f of [facts.website, facts.gbp, facts.reviews, facts.phone]) {
      if (f.state === "detected") signals.push({ label: `${f.label} detected`, detail: f.value, tone: "good" });
      else if (f.state === "not_detected") signals.push({ label: `${f.label} not detected`, tone: "watch" });
    }
  }
  for (const s of compliance) if (s.tone !== "neutral") signals.push(s);

  return {
    sector,
    digital: facts,
    digitalMeasured: measured,
    digitalSource: source,
    compliance,
    signals,
    score,
    scoreBasis: basis,
    commonlyInvests: commonInvestmentsFor(sector, category),
    relevantFor: relevantProviders(c, counts, facts, measured),
  };
}
