// ============================================================
// Alerts engine
// ------------------------------------------------------------
// Users define standing rules ("New AI companies in London") and
// CompaniesIQ evaluates them against newly incorporated companies,
// delivering matches by email / Slack / webhook. This module holds
// the rule shape + the pure matching predicate; delivery lives in
// the /api/alerts/run route.
// ============================================================
import type { EnrichedResult } from "./data";

export type AlertChannel = "email" | "slack" | "webhook";

export interface AlertRule {
  id: string;
  name: string;
  keywords?: string[]; // any-of, matched against result keyword signals
  sector?: string; // result classification sector
  region?: string; // resolved region
  status?: string[]; // company status any-of
  channel: AlertChannel;
  destination: string; // email address / slack or webhook URL
  active: boolean;
  createdAt?: string;
}

export function ruleSummary(a: AlertRule): string {
  const parts: string[] = [];
  if (a.keywords?.length) parts.push(a.keywords.join("/"));
  if (a.sector) parts.push(a.sector);
  if (a.region) parts.push(a.region);
  if (a.status?.length) parts.push(a.status.join("/"));
  return parts.length ? parts.join(" · ") : "All new companies";
}

/** Does a company result satisfy this alert rule? */
export function matchesRule(rule: AlertRule, r: EnrichedResult): boolean {
  if (rule.status?.length && !rule.status.includes(String(r.status))) return false;
  if (rule.region && r.region !== rule.region) return false;
  if (rule.sector && r.classification?.sector !== rule.sector) return false;
  if (rule.keywords?.length) {
    const kw = r.keywords ?? [];
    if (!rule.keywords.some((k) => kw.includes(k))) return false;
  }
  return true;
}

export function matchAll(rule: AlertRule, results: EnrichedResult[]): EnrichedResult[] {
  return results.filter((r) => matchesRule(rule, r));
}
