// ============================================================
// Revenue Autopilot — the playbook (pure, no I/O).
//
// Given one account's first-party history, decide:
//   • how likely they are to buy (intent score 0–100 → hot / warm / cold), and
//   • the single lifecycle email that would help most right now, if any.
//
// Kept pure so the rules are easy to read, tune and reason about: the engine
// (lib/growth/engine.ts) only loads data and executes what this returns.
//
// Rules are tuned to the funnel we actually have (Oct 2026): sign-up converts
// well, but 6 of 8 checkout starts didn't complete — so recovery comes first.
// ============================================================

import { SEARCH_INTENT_POINTS, type SearchIntent } from "@/lib/growth/intent";

export type Template = "checkout_recovery" | "checkout_recovery_2" | "paywall_followup" | "activation";

export const TEMPLATE_LABELS: Record<Template, string> = {
  checkout_recovery: "Checkout recovery",
  checkout_recovery_2: "Recovery follow-up",
  paywall_followup: "Paywall follow-up",
  activation: "Activation",
};

export interface UserEvent {
  event: string;
  plan: string | null;
  billing: string | null;
  ref: string | null;
  at: number; // epoch ms
  meta?: Record<string, unknown> | null;
}

export interface SentEmail {
  template: string;
  ref: string;
  at: number;
}

export interface UserSnapshot {
  userId: string;
  email: string;
  name: string | null;
  signedUpAt: number;
  paid: boolean; // active/trialing paid subscription
  comped: boolean; // admin/partner — never marketed to
  optOut: boolean;
  events: UserEvent[]; // newest first
  activity: number; // product actions (exports, watch adds, saved searches, lookups) in 30d
  lastActivityAt: number | null;
  emails: SentEmail[]; // sent (live) emails, newest first
}

export interface Decision {
  template: Template;
  ref: string; // dedupe key ('' unless tied to a checkout session)
  plan: string; // plan to pitch / resume
  billing: "monthly" | "annual";
  reason: string;
}

export interface Assessment {
  score: number;
  tier: "hot" | "warm" | "cold";
  stage: string;
  signals: string[];
  next: Decision | null;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Never send more than one lifecycle email per account inside this window. */
export const MIN_GAP_MS = 2 * DAY;

const count = (evs: UserEvent[], name: string, since: number) =>
  evs.filter((e) => e.event === name && e.at >= since).length;

/** Latest checkout start that never completed, if any. */
export function openCheckout(s: UserSnapshot): UserEvent | null {
  const started = s.events.find((e) => e.event === "checkout_started");
  if (!started) return null;
  const completedAfter = s.events.some((e) => e.event === "checkout_completed" && e.at >= started.at);
  return completedAfter ? null : started;
}

export function scoreUser(s: UserSnapshot, now: number): { score: number; signals: string[] } {
  const since14 = now - 14 * DAY;
  const signals: string[] = [];
  let score = 0;

  const open = openCheckout(s);
  if (open && open.at >= now - 14 * DAY) {
    score += 45;
    signals.push(`Started ${open.plan ?? "plan"} checkout`);
  }
  const selects = count(s.events, "plan_select", since14);
  if (selects) {
    score += 15;
    signals.push("Chose a plan");
  }
  const priceViews = count(s.events, "pricing_view", since14) + count(s.events, "upgrade_view", since14);
  if (priceViews) {
    score += Math.min(20, priceViews * 10);
    signals.push(`${priceViews}× pricing/upgrade view`);
  }
  const walls = count(s.events, "paywall_view", since14);
  if (walls) {
    score += Math.min(24, walls * 8);
    signals.push(`${walls}× hit a paywall`);
  }
  // On-site search: what they searched for says what job they're doing. A
  // company look-up is research; a market, new-company or leads search is the
  // start of a prospect list — the demand CompaniesIQ actually sells to.
  const searches = s.events.filter((e) => e.event === "search" && e.at >= since14);
  if (searches.length) {
    const pts = searches.reduce((sum, e) => sum + (SEARCH_INTENT_POINTS[(e.meta?.intent as SearchIntent) ?? "lookup"] ?? 2), 0);
    score += Math.min(25, pts);
    const commercial = searches.filter((e) => e.meta?.intent && e.meta.intent !== "lookup").length;
    signals.push(commercial ? `${commercial}× market/leads search` : `${searches.length}× company look-up`);
  }
  const capped = count(s.events, "search_capped", since14);
  if (capped) {
    score += Math.min(20, capped * 10);
    signals.push(`${capped}× hit the results cap`);
  }
  const gated = count(s.events, "gated_action", since14);
  if (gated) {
    score += Math.min(24, gated * 12);
    signals.push(`${gated}× tried a paid action`);
  }
  if (s.activity) {
    score += Math.min(15, s.activity * 3);
    signals.push(`${s.activity} product actions`);
  }
  if (now - s.signedUpAt < 7 * DAY) {
    score += 5;
    signals.push("New this week");
  }

  // Recency decay: interest two weeks old is worth half.
  const lastTouch = Math.max(s.events[0]?.at ?? 0, s.lastActivityAt ?? 0, s.signedUpAt);
  if (now - lastTouch > 14 * DAY) score = Math.round(score * 0.5);

  return { score: Math.min(100, score), signals };
}

function stageOf(s: UserSnapshot, open: UserEvent | null): string {
  if (s.paid) return "Customer";
  if (open) return "Checkout abandoned";
  if (s.events.some((e) => ["pricing_view", "upgrade_view", "plan_select", "paywall_view", "search_capped", "gated_action"].includes(e.event))) return "Evaluating";
  if (s.events.some((e) => e.event === "search" && e.meta?.intent && e.meta.intent !== "lookup")) return "Exploring a market";
  if (s.activity > 0) return "Active free";
  return "Signed up";
}

const sentTemplate = (s: UserSnapshot, t: Template, ref?: string) =>
  s.emails.find((e) => e.template === t && (ref === undefined || e.ref === ref));

export function decide(s: UserSnapshot, now: number): Decision | null {
  if (s.paid || s.comped || s.optOut || !s.email) return null;
  if (s.emails[0] && now - s.emails[0].at < MIN_GAP_MS) return null;

  const open = openCheckout(s);
  const pitchPlan = open?.plan || s.events.find((e) => e.plan)?.plan || "analyst";
  const billing: "monthly" | "annual" = open?.billing === "annual" ? "annual" : "monthly";

  // 1. Abandoned checkout — wait an hour (they may still be on Stripe), give up
  //    after 3 days. One email per checkout session.
  if (open && now - open.at >= HOUR && now - open.at <= 3 * DAY) {
    const ref = open.ref ?? "";
    if (!sentTemplate(s, "checkout_recovery", ref)) {
      return { template: "checkout_recovery", ref, plan: pitchPlan, billing, reason: "Started checkout, didn't finish" };
    }
  }

  // 2. Follow-up — 3+ days after the first recovery, while the intent is < 14 days old.
  const firstRecovery = sentTemplate(s, "checkout_recovery");
  if (
    open &&
    firstRecovery &&
    now - firstRecovery.at >= 3 * DAY &&
    now - open.at <= 14 * DAY &&
    !sentTemplate(s, "checkout_recovery_2")
  ) {
    return { template: "checkout_recovery_2", ref: "", plan: pitchPlan, billing: "monthly", reason: "Recovery email didn't convert" };
  }

  // 3. Repeated paywall / pricing interest with no checkout in 14 days.
  const since14 = now - 14 * DAY;
  // Any wall counts: a gated page, a capped result list, or a paid action clicked.
  const walls = count(s.events, "paywall_view", since14) + count(s.events, "search_capped", since14) + count(s.events, "gated_action", since14);
  const pricing = count(s.events, "pricing_view", since14) + count(s.events, "upgrade_view", since14);
  const recentCheckout = s.events.some((e) => e.event === "checkout_started" && e.at >= since14);
  const lastPaywallMail = sentTemplate(s, "paywall_followup");
  if (
    !recentCheckout &&
    (walls >= 2 || (walls >= 1 && pricing >= 1)) &&
    (!lastPaywallMail || now - lastPaywallMail.at > 30 * DAY)
  ) {
    return { template: "paywall_followup", ref: "", plan: pitchPlan, billing: "monthly", reason: `${walls} paywall/cap hits, no checkout` };
  }

  // 4. Activation — signed up 1–4 days ago and hasn't done anything yet. Once ever.
  const age = now - s.signedUpAt;
  if (age >= DAY && age <= 4 * DAY && s.activity === 0 && s.events.length === 0 && !sentTemplate(s, "activation")) {
    return { template: "activation", ref: "", plan: "analyst", billing: "monthly", reason: "No activity since sign-up" };
  }

  return null;
}

export function assess(s: UserSnapshot, now: number): Assessment {
  const { score, signals } = scoreUser(s, now);
  const open = openCheckout(s);
  return {
    score,
    tier: score >= 60 ? "hot" : score >= 30 ? "warm" : "cold",
    stage: stageOf(s, open),
    signals,
    next: decide(s, now),
  };
}
