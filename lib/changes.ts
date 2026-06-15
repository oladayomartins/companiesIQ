// Turn Companies House filing history into a human "recent changes" timeline —
// new directors, charges, accounts filed, address/name/PSC/status changes.
// Pure + client-safe; works off the filings we already fetch (no extra CH calls).
import type { Filing } from "@/lib/types";
import type { IconName } from "@/components/ds";

export type ChangeTone = "good" | "watch" | "neutral";

export interface ChangeEvent {
  date: string;
  label: string; // friendly event label
  detail?: string; // the raw filing description, when it adds colour
  icon: IconName;
  tone: ChangeTone;
}

interface Rule {
  test: RegExp;
  label: string;
  icon: IconName;
  tone: ChangeTone;
}

// Matched against `${type} ${label}` (form code + description), first hit wins.
const RULES: Rule[] = [
  { test: /\b(TM01|TM02)\b|terminat|resign|cessation|ceased/i, label: "Officer resigned", icon: "users", tone: "watch" },
  { test: /\b(AP0\d)\b|appointment of|appointed/i, label: "Director appointed", icon: "users", tone: "good" },
  { test: /satisf/i, label: "Charge satisfied", icon: "shield", tone: "neutral" },
  { test: /\b(MR0\d)\b|charge|mortgage/i, label: "Charge registered", icon: "shield", tone: "watch" },
  { test: /\b(AA|AAMD)\b|accounts/i, label: "Accounts filed", icon: "file", tone: "neutral" },
  { test: /\b(CS01)\b|confirmation statement|annual return/i, label: "Confirmation statement", icon: "check", tone: "neutral" },
  { test: /\b(AD0\d)\b|registered office|address/i, label: "Registered office changed", icon: "pin", tone: "neutral" },
  { test: /change of name|\bNM\b|name change/i, label: "Company name changed", icon: "building", tone: "neutral" },
  { test: /significant control|\bPSC\b|psc0/i, label: "Ownership (PSC) change", icon: "users", tone: "neutral" },
  { test: /\b(SH0\d)\b|allotment|share capital|capital/i, label: "Share capital change", icon: "barChart", tone: "neutral" },
  { test: /resolution/i, label: "Resolution filed", icon: "file", tone: "neutral" },
  { test: /dissolv|strike|gazette|liquidat|administration/i, label: "Status change / strike-off", icon: "alert", tone: "watch" },
  { test: /\b(NEWINC)\b|incorporat/i, label: "Incorporated", icon: "star", tone: "good" },
];

export function toTimeline(filings: Filing[], limit = 12): ChangeEvent[] {
  const events = (filings || [])
    .filter((f) => f.date)
    .map((f) => {
      const hay = `${f.type} ${f.label}`;
      const rule = RULES.find((r) => r.test.test(hay));
      return {
        date: f.date,
        label: rule ? rule.label : f.label || "Filing",
        detail: rule && f.label && f.label.toLowerCase() !== rule.label.toLowerCase() ? f.label : undefined,
        icon: rule ? rule.icon : ("file" as IconName),
        tone: (rule ? rule.tone : "neutral") as ChangeTone,
      };
    });
  // Filings come newest-first from CH; keep that order, cap the list.
  return events.slice(0, limit);
}
