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
  /** Prefix for tab/panel ids. When set, each tab points at its panel with
   *  aria-controls, so the caller renders `role="tabpanel"` elements with ids
   *  from `tabPanelId(prefix, id)`. */
  idPrefix?: string;
  ariaLabel?: string;
}

export const tabButtonId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const tabPanelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

function tabId(t: TabDef): string {
  return typeof t === "string" ? t : t.id;
}

export function Tabs({ tabs = [], value, defaultValue, onChange, variant = "underline", className = "", idPrefix, ariaLabel }: TabsProps) {
  const first = tabs[0] ? tabId(tabs[0]) : "";
  const [internal, setInternal] = React.useState(defaultValue ?? first);
  const active = value !== undefined ? value : internal;
  const select = (id: string) => {
    if (value === undefined) setInternal(id);
    onChange && onChange(id);
  };
  // Roving tabindex: one tab stop for the whole list, arrows move between tabs
  // (WAI-ARIA tabs pattern, automatic activation).
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const ids = tabs.map(tabId);
    const i = ids.indexOf(active);
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (i + 1) % ids.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + ids.length) % ids.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = ids.length - 1;
    if (next == null) return;
    e.preventDefault();
    select(ids[next]);
    const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    btns[next]?.focus();
  };
  return (
    <div
      className={["ciq-tabs", variant === "pill" ? "ciq-tabs--pill" : "", className].filter(Boolean).join(" ")}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {tabs.map((t) => {
        const id = tabId(t);
        const label = typeof t === "string" ? t : t.label ?? t.id;
        const icon = typeof t === "string" ? undefined : t.icon;
        const count = typeof t === "string" ? undefined : t.count;
        const on = id === active;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            id={idPrefix ? tabButtonId(idPrefix, id) : undefined}
            aria-controls={idPrefix ? tabPanelId(idPrefix, id) : undefined}
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
