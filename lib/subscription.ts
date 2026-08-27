// ============================================================
// Subscription model — freemium. Free users can browse, search and
// view basic reports; paid tiers unlock history, alerts, watchlists,
// exports and the API. Indicative pricing per the product blueprint.
// ============================================================

export type PlanId = "free" | "analyst" | "team" | "enterprise";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number | null; // £/user/mo, null = custom
  annual: number | null;  // £/user/mo when billed annually
  // What the card is actually charged on an annual plan, per user, per year.
  // Stripe bills this as a single yearly amount, so showing only the /mo
  // equivalent means the checkout total is a surprise.
  annualTotal?: number;
  popular?: boolean;
  ctaVariant: "primary" | "secondary" | "inverse";
  cta: string;
  features: string[];
  // capability gates
  caps: {
    fullReport: boolean;
    historicalData: boolean;
    watchlists: number; // -1 = unlimited
    alerts: boolean;
    savedSearches: boolean;
    csvExport: boolean;
    api: boolean;
  };
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Read the register, for free.",
    monthly: 0,
    annual: 0,
    ctaVariant: "secondary",
    cta: "Start free",
    features: ["Unlimited search & filters", "Company profiles", "Trend dashboards", "Basic intelligence reports"],
    caps: { fullReport: false, historicalData: false, watchlists: 0, alerts: false, savedSearches: false, csvExport: false, api: false },
  },
  {
    id: "analyst",
    name: "Analyst",
    tagline: "For individuals doing the digging.",
    monthly: 39,
    annual: 31,
    annualTotal: 372,
    ctaVariant: "secondary",
    cta: "Get Analyst",
    features: ["Everything in Free", "Full intelligence reports", "10-year filing history", "1 watchlist · 50 companies", "CSV export", "Email support"],
    caps: { fullReport: true, historicalData: true, watchlists: 1, alerts: false, savedSearches: true, csvExport: true, api: false },
  },
  {
    id: "team",
    name: "Team",
    tagline: "For teams who track and act together.",
    monthly: 129,
    annual: 103,
    annualTotal: 1236,
    popular: true,
    ctaVariant: "primary",
    cta: "Get Team",
    features: ["Everything in Analyst", "Unlimited watchlists", "Real-time signal alerts", "Shared lists & seats (5)", "Market & sector analytics", "API access · 10k calls/mo", "Priority support"],
    caps: { fullReport: true, historicalData: true, watchlists: -1, alerts: true, savedSearches: true, csvExport: true, api: true },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For the whole organisation.",
    monthly: null,
    annual: null,
    ctaVariant: "secondary",
    cta: "Talk to sales",
    features: ["Everything in Team", "Unlimited seats & API", "Bulk data & warehouse sync", "Custom signal models", "SSO / SAML & audit logs", "Dedicated success manager", "SLA & onboarding"],
    caps: { fullReport: true, historicalData: true, watchlists: -1, alerts: true, savedSearches: true, csvExport: true, api: true },
  },
];

export function planById(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) || PLANS[0];
}

/** The public pricing page shows every plan — Free is the plan most first-time
 *  visitors arrive looking for, and the paid tiers describe themselves in terms
 *  of it ("Everything in Free"). */
export const PRICING_TIERS = PLANS;

/** The in-app upgrade screen omits Free: the reader is already on it. */
export const MARKETING_TIERS = PLANS.filter((p) => p.id !== "free");

/** The entry paid plan, by name. Referenced wherever the UI needs to name the
 *  thing a reader is being asked to buy, so one rename updates every surface.
 *  Must match the Stripe product name ("CompaniesIQ Analyst"). */
export const ENTRY_PAID_PLAN = planById("analyst");
