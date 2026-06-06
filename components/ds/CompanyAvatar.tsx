import React from "react";

const PALETTE: [string, string][] = [
  ["var(--accent-tint)", "var(--accent)"],
  ["var(--info-bg)", "var(--info)"],
  ["var(--pos-bg)", "var(--pos)"],
  ["var(--warn-bg)", "var(--warn)"],
];

function initials(name = ""): string {
  const parts = name
    .replace(/\b(ltd|limited|plc|llp|inc|the)\b/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name.slice(0, 2).toUpperCase();
}

export interface CompanyAvatarProps {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: number;
  className?: string;
}

export function CompanyAvatar({ name = "", src, size = "md", tone, className = "" }: CompanyAvatarProps) {
  const idx =
    tone != null
      ? tone % PALETTE.length
      : [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length;
  const [bg, fg] = PALETTE[idx];
  return (
    <span
      className={["ciq-avatar", `ciq-avatar--${size}`, className].filter(Boolean).join(" ")}
      style={src ? undefined : { background: bg, color: fg }}
      title={name}
    >
      {src ? <img src={src} alt={name} /> : initials(name)}
    </span>
  );
}
