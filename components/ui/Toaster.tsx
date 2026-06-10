"use client";
import { useEffect, useState, useCallback } from "react";
import { Icon, type IconName } from "@/components/ds";
import { onToast, type ToastItem } from "@/lib/toast";

const TONE_ICON: Record<string, IconName> = {
  success: "check",
  error: "x",
  info: "bell",
  pending: "clock",
};

// Single global toast stack. Mounted once in the root layout. Subscribes to the
// toast bus, renders each toast with an enter animation, and auto-dismisses.
export function Toaster() {
  const [items, setItems] = useState<(ToastItem & { leaving?: boolean })[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((cur) => cur.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    // Remove after the exit animation.
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 220);
  }, []);

  useEffect(() => {
    return onToast((t) => {
      setItems((cur) => [...cur, t].slice(-4)); // cap the stack
      if (t.duration > 0) setTimeout(() => dismiss(t.id), t.duration);
    });
  }, [dismiss]);

  if (!items.length) return null;

  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}${t.leaving ? " toast--leaving" : ""}`}>
          <span className="toast__icon">
            <Icon name={TONE_ICON[t.tone] ?? "check"} size={15} stroke={2.5} />
          </span>
          <span className="toast__msg">{t.message}</span>
          <button className="toast__close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
