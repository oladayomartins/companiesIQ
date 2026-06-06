"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, Icon } from "@/components/ds";
import { RANGES, DEFAULT_RANGE } from "@/lib/ranges";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function monthLabel(y: number, m: number): string {
  return new Date(y, m, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** Date-range selector: preset chips plus a custom range calendar. Drives the `range` or `from`/`to` URL params. */
export function DateRangeSelector() {
  const router = useRouter();
  const params = useSearchParams();
  const urlFrom = params.get("from") || "";
  const urlTo = params.get("to") || "";
  const isCustom = !!(urlFrom && urlTo);
  const current = isCustom ? "custom" : params.get("range") || DEFAULT_RANGE;
  const todayISO = toISO(new Date());

  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<string | null>(urlFrom || null);
  const [end, setEnd] = useState<string | null>(urlTo || null);
  const [hover, setHover] = useState<string | null>(null);
  const anchor = fromISO(urlTo || urlFrom || todayISO);
  const [view, setView] = useState({ y: anchor.getFullYear(), m: anchor.getMonth() });

  function onTab(id: string) {
    if (id === "custom") {
      setOpen((v) => !v);
      return;
    }
    setOpen(false);
    router.push(id === DEFAULT_RANGE ? "/app" : `/app?range=${id}`);
  }

  function pickDay(iso: string) {
    if (!start || (start && end)) {
      setStart(iso);
      setEnd(null);
    } else if (iso < start) {
      setEnd(start);
      setStart(iso);
    } else {
      setEnd(iso);
    }
  }

  function shiftMonth(delta: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function apply() {
    if (start && end) {
      router.push(`/app?from=${start}&to=${end}`);
      setOpen(false);
    }
  }

  // Build the day grid for the viewed month.
  const firstDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(view.y, view.m, d)));

  const effEnd = end || hover;
  const lo = start && effEnd ? (start < effEnd ? start : effEnd) : null;
  const hi = start && effEnd ? (start > effEnd ? start : effEnd) : null;
  const canApply = !!(start && end);
  const rangeText = start ? `${start}${end ? `  →  ${end}` : "  →  …"}` : "Pick a start date";

  return (
    <div className="range-select">
      <Tabs
        variant="pill"
        value={current}
        onChange={onTab}
        tabs={[...RANGES.map((r) => ({ id: r.id, label: r.short })), { id: "custom", label: "Custom" }]}
      />
      {open ? (
        <>
          <div className="cal-backdrop" onClick={() => setOpen(false)} />
          <div className="range-cal" role="dialog" aria-label="Choose a date range">
            <div className="cal-head">
              <button className="cal-navbtn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                <Icon name="chevronRight" size={16} style={{ transform: "rotate(180deg)" }} />
              </button>
              <span className="cal-title">{monthLabel(view.y, view.m)}</span>
              <button className="cal-navbtn" onClick={() => shiftMonth(1)} aria-label="Next month">
                <Icon name="chevronRight" size={16} />
              </button>
            </div>
            <div className="cal-grid">
              {WEEKDAYS.map((w) => (
                <span key={w} className="cal-dow">{w}</span>
              ))}
              {cells.map((iso, i) =>
                iso === null ? (
                  <span key={`b${i}`} className="cal-day cal-day--blank" />
                ) : (
                  (() => {
                    const disabled = iso > todayISO;
                    const isEdge = iso === start || iso === end;
                    const inRange = lo && hi && iso > lo && iso < hi;
                    return (
                      <button
                        key={iso}
                        disabled={disabled}
                        onMouseEnter={() => setHover(iso)}
                        onMouseLeave={() => setHover(null)}
                        onClick={() => pickDay(iso)}
                        className={["cal-day", isEdge ? "cal-day--edge" : "", inRange ? "cal-day--in" : ""].filter(Boolean).join(" ")}
                      >
                        {Number(iso.slice(8))}
                      </button>
                    );
                  })()
                )
              )}
            </div>
            <div className="cal-foot">
              <span className="cal-range mono">{rangeText}</span>
              <div className="cal-actions">
                <button className="cal-btn" onClick={() => { setStart(null); setEnd(null); }}>Clear</button>
                <button className="cal-btn cal-btn--primary" onClick={apply} disabled={!canApply}>Apply</button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
