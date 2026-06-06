import React from "react";
import { Icon } from "./Icon";

export interface StatProps {
  label?: React.ReactNode;
  value: React.ReactNode;
  delta?: string;
  deltaDir?: "up" | "down" | "flat";
  sub?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Stat({ label, value, delta, deltaDir, sub, size = "md", className = "" }: StatProps) {
  const dir = deltaDir || (delta == null ? null : String(delta).trim().startsWith("-") ? "down" : "up");
  return (
    <div className={["ciq-stat", `ciq-stat--${size}`, className].filter(Boolean).join(" ")}>
      {label ? <span className="ciq-stat__label">{label}</span> : null}
      <span className="ciq-stat__value">{value}</span>
      {delta != null || sub ? (
        <div className="ciq-stat__foot">
          {delta != null ? (
            <span className={`ciq-stat__delta ciq-stat__delta--${dir}`}>
              {dir !== "flat" ? <Icon name={dir === "down" ? "trendDown" : "trendUp"} size={13} /> : null}
              {delta}
            </span>
          ) : null}
          {sub ? <span className="ciq-stat__sub">{sub}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
