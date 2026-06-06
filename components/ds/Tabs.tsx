"use client";
import React from "react";
import { Icon, type IconName } from "./Icon";

export type TabDef = string | { id: string; label?: string; icon?: IconName; count?: number };

export interface TabsProps {
  tabs?: TabDef[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  variant?: "underline" | "pill";
  className?: string;
}

function tabId(t: TabDef): string {
  return typeof t === "string" ? t : t.id;
}

export function Tabs({ tabs = [], value, defaultValue, onChange, variant = "underline", className = "" }: TabsProps) {
  const first = tabs[0] ? tabId(tabs[0]) : "";
  const [internal, setInternal] = React.useState(defaultValue ?? first);
  const active = value !== undefined ? value : internal;
  const select = (id: string) => {
    if (value === undefined) setInternal(id);
    onChange && onChange(id);
  };
  return (
    <div className={["ciq-tabs", variant === "pill" ? "ciq-tabs--pill" : "", className].filter(Boolean).join(" ")} role="tablist">
      {tabs.map((t) => {
        const id = tabId(t);
        const label = typeof t === "string" ? t : t.label ?? t.id;
        const icon = typeof t === "string" ? undefined : t.icon;
        const count = typeof t === "string" ? undefined : t.count;
        const on = id === active;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={on}
            className={["ciq-tab", on ? "ciq-tab--active" : ""].filter(Boolean).join(" ")}
            onClick={() => select(id)}
          >
            {icon ? <Icon name={icon} size={15} /> : null}
            {label}
            {count != null ? <span className="ciq-tab__count">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
