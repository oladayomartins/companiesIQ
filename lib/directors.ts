// ============================================================
// Director / serial-founder intelligence
// ------------------------------------------------------------
// Turns an officer's cross-company appointment history into signal:
//   · serial-founder / prolific-director detection
//   · active vs total directorships
//   · network reach (distinct companies) and recency
// Built on the Companies House appointments endpoint — evidence-only,
// no inference about people beyond what the register records.
// ============================================================
import type { OfficerProfile, OfficerAppointment } from "./types";

export const SERIAL_THRESHOLD = 3; // total appointments to be flagged "serial"
export const PROLIFIC_THRESHOLD = 6; // total appointments to be flagged "prolific"

export type FounderTier = "Single" | "Multiple" | "Serial" | "Prolific";

export interface DirectorInsight {
  tier: FounderTier;
  isSerial: boolean;
  total: number;
  active: number;
  dissolved: number;
  firstAppointed?: string;
  latestAppointed?: string;
  newestCompanies: OfficerAppointment[];
  note: string;
}

function tierFor(total: number): FounderTier {
  if (total >= PROLIFIC_THRESHOLD) return "Prolific";
  if (total >= SERIAL_THRESHOLD) return "Serial";
  if (total >= 2) return "Multiple";
  return "Single";
}

export function analyzeOfficer(p: OfficerProfile): DirectorInsight {
  const appts = [...p.appointments].sort((a, b) => (b.appointed || "").localeCompare(a.appointed || ""));
  const total = p.totalAppointments || appts.length;
  const active = p.activeAppointments || appts.filter((a) => a.active).length;
  const dissolved = appts.filter((a) => a.companyStatus && a.companyStatus !== "active").length;
  const dates = appts.map((a) => a.appointed).filter(Boolean) as string[];
  dates.sort();
  const tier = tierFor(total);

  let note: string;
  if (tier === "Prolific") note = `Prolific director — appointed to ${total} companies. Strong network signal; review for shell/holding structures.`;
  else if (tier === "Serial") note = `Serial founder — ${total} appointments across the register, ${active} still active.`;
  else if (tier === "Multiple") note = `Holds ${total} directorships.`;
  else note = "Single directorship on record.";

  return {
    tier,
    isSerial: total >= SERIAL_THRESHOLD,
    total,
    active,
    dissolved,
    firstAppointed: dates[0],
    latestAppointed: dates[dates.length - 1],
    newestCompanies: appts.slice(0, 6),
    note,
  };
}

export function tierTone(tier: FounderTier): "neutral" | "info" | "accent" | "pos" {
  if (tier === "Prolific") return "accent";
  if (tier === "Serial") return "pos";
  if (tier === "Multiple") return "info";
  return "neutral";
}
