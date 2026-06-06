import React from "react";

export type BadgeTone = "neutral" | "pos" | "positive" | "neg" | "negative" | "warn" | "warning" | "info" | "accent";

const TONE: Record<string, string> = {
  neutral: "neutral",
  pos: "pos",
  positive: "pos",
  neg: "neg",
  negative: "neg",
  warn: "warn",
  warning: "warn",
  info: "info",
  accent: "accent",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

export function Badge({ children, tone = "neutral", dot = false, className = "", ...rest }: BadgeProps) {
  const t = TONE[tone] || "neutral";
  return (
    <span className={["ciq-badge", `ciq-badge--${t}`, className].filter(Boolean).join(" ")} {...rest}>
      {dot ? <span className="ciq-badge__dot" /> : null}
      {children}
    </span>
  );
}

/** Company-status convenience wrapper mapping registry statuses to tones. */
const STATUS: Record<string, { tone: BadgeTone; label: string }> = {
  active: { tone: "pos", label: "Active" },
  dormant: { tone: "warn", label: "Dormant" },
  liquidation: { tone: "warn", label: "In liquidation" },
  dissolved: { tone: "neg", label: "Dissolved" },
  administration: { tone: "neg", label: "Administration" },
  "voluntary-arrangement": { tone: "warn", label: "Voluntary arrangement" },
  "converted-closed": { tone: "neutral", label: "Converted / closed" },
  "insolvency-proceedings": { tone: "neg", label: "Insolvency" },
  "in-administration": { tone: "neg", label: "Administration" },
  open: { tone: "pos", label: "Active" },
};

export function StatusPill({ status = "active", className = "" }: { status?: string; className?: string }) {
  const s = STATUS[String(status).toLowerCase()] || { tone: "neutral" as BadgeTone, label: status };
  return (
    <Badge tone={s.tone} dot className={className}>
      {s.label}
    </Badge>
  );
}
