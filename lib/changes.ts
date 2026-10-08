// Turn Companies House filing history into a human "recent changes" timeline —
// new directors, charges, accounts filed, address/name/PSC/status changes.
// Pure + client-safe; works off the filings we already fetch (no extra CH calls).
import type { Filing } from "@/lib/types";
import type { IconName } from "@/components/ds";

export type ChangeTone = "good" | "watch" | "neutral";

/** "status" = the company's standing on the register changed; "filing" = everything else. */
export type ChangeKind = "filing" | "status";

export interface ChangeEvent {
  date: string;
  label: string; // friendly event label
  detail?: string; // the raw filing description, when it adds colour
  icon: IconName;
  tone: ChangeTone;
  kind: ChangeKind;
}

interface Rule {
  test: RegExp;
  label: string;
  icon: IconName;
  tone: ChangeTone;
  kind?: ChangeKind;
}

// Matched against `${type} ${label}` (form code + description), first hit wins.
// Strike-off and restoration come first: GAZ1/GAZ2/RT01 descriptions are terse
// ("Gazette notice compulsory") and would otherwise fall through to generic rules.
const RULES: Rule[] = [
  { test: /GAZ2|gazette dissolved|dissolved via/i, label: "Struck off & dissolved", icon: "alert", tone: "watch", kind: "status" },
  { test: /GAZ1|gazette notice|first gazette/i, label: "Strike-off notice", icon: "alert", tone: "watch", kind: "status" },
  { test: /SOAS|strike-?off .*(discontinued|suspended)/i, label: "Strike-off action stopped", icon: "check", tone: "good", kind: "status" },
  { test: /(RT01|AC9\d)|restoration|restored/i, label: "Restored to the register", icon: "clock", tone: "good", kind: "status" },
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
  { test: /dissolv|strike|gazette|liquidat|administration/i, label: "Status change / strike-off", icon: "alert", tone: "watch", kind: "status" },
  { test: /\b(NEWINC)\b|incorporat/i, label: "Incorporated", icon: "star", tone: "good" },
];

export function toTimeline(filings: Filing[], limit: number | null = 12): ChangeEvent[] {
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
        kind: rule?.kind ?? "filing",
      };
    });
  // Filings come newest-first from CH; keep that order, cap the list.
  return limit == null ? events : events.slice(0, limit);
}

const TIMES = ["never", "once", "twice", "three times"];
const times = (n: number) => TIMES[n] ?? `${n} times`;

/**
 * One deterministic sentence about strike-offs and restorations, or null when
 * there is nothing to say. Counted from the timeline, so it can only state what
 * the filing history holds — no model call, nothing inferred.
 */
export function statusSummary(events: ChangeEvent[], opts: { accountsFiled: boolean }): string | null {
  const struck = events.filter((e) => e.label === "Struck off & dissolved").length;
  const notices = events.filter((e) => e.label === "Strike-off notice").length;
  const restored = events.filter((e) => e.label === "Restored to the register").length;
  if (!struck && !notices) return null;
  if (!struck) {
    return `Received ${notices === 1 ? "a strike-off notice" : `${times(notices)} strike-off notices`} without being dissolved.`;
  }
  const head = `Struck off and dissolved ${times(struck)}`;
  if (!restored) return `${head}, with no restoration in the filing history shown.`;
  const back = restored >= struck ? (struck === 1 ? "and restored" : `and restored ${struck === 2 ? "both times" : "each time"}`) : `and restored ${times(restored)}`;
  return `${head}, ${back}.${opts.accountsFiled ? "" : " Accounts have never been filed."}`;
}
