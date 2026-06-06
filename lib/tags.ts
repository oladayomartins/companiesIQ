// ============================================================
// Factual company tags (evidence-first; replaces the opportunity score)
// ------------------------------------------------------------
// Every tag is a verifiable fact from Companies House (+ ONS sector
// growth, clearly a published reference). No black-box scoring.
// Client-safe — no server-only deps.
// ============================================================
import { daysSince, yearsSince } from "./format";
import { SECTOR_STATS } from "./ons";

export type TagTone = "accent" | "pos" | "info" | "neutral" | "warn";
export interface FactualTag {
  label: string;
  tone: TagTone;
}

export function factualTags(input: { incorporated?: string; sector?: string; sicCodes?: string[]; status?: string }): FactualTag[] {
  const tags: FactualTag[] = [];

  const d = daysSince(input.incorporated);
  if (d != null && d <= 30) tags.push({ label: "New", tone: "accent" });
  else if (d != null && d <= 365) tags.push({ label: "Recent registration", tone: "info" });

  const sec = input.sector ? SECTOR_STATS[input.sector] : undefined;
  if (sec && sec.annualGrowth >= 8) tags.push({ label: "Growing sector", tone: "pos" });

  if ((input.sicCodes || []).some((c) => c.startsWith("642"))) tags.push({ label: "Holding company", tone: "neutral" });

  const y = yearsSince(input.incorporated);
  if (tags.length < 2 && y != null && y >= 10) tags.push({ label: `Established · ${y}y`, tone: "neutral" });

  return tags.slice(0, 2);
}
