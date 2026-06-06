// ============================================================
// Alerts engine
// ------------------------------------------------------------
// Users define standing rules from FACTUAL Companies House fields —
// industry (SIC sector), SIC code, region, and status — and
// CompaniesIQ evaluates them against newly incorporated companies,
// delivering matches by email / Slack / webhook. No keyword guessing:
// every criterion is verifiable on the register.
// ============================================================
import type { EnrichedResult } from "./data";

export type AlertChannel = "email" | "slack" | "webhook";

export interface AlertRule {
  id: string;
  name: string;
  sector?: string; // SIC sector (classified)
  sic?: string; // exact SIC code
  region?: string; // resolved region
  status?: string[]; // company status any-of
  channel: AlertChannel;
  destination: string; // email address / slack or webhook URL
  active: boolean;
  createdAt?: string;
}

export function ruleSummary(a: AlertRule): string {
  const parts: string[] = [];
  if (a.sector) parts.push(a.sector);
  if (a.sic) parts.push(`SIC ${a.sic}`);
  if (a.region) parts.push(a.region);
  if (a.status?.length) parts.push(a.status.join("/"));
  return parts.length ? parts.join(" · ") : "All new companies";
}

/** Does a company result satisfy this alert rule? (all factual) */
export function matchesRule(rule: AlertRule, r: EnrichedResult): boolean {
  if (rule.status?.length && !rule.status.includes(String(r.status))) return false;
  if (rule.region && r.region !== rule.region) return false;
  if (rule.sector && r.classification?.sector !== rule.sector) return false;
  if (rule.sic && !(r.sicCodes || []).includes(rule.sic)) return false;
  return true;
}

export function matchAll(rule: AlertRule, results: EnrichedResult[]): EnrichedResult[] {
  return results.filter((r) => matchesRule(rule, r));
}
