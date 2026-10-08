"use client";
// InfoTip — the ⓘ next to a metric, explaining what it means.
//
// A real <button> trigger. Opens on hover, on keyboard focus and on tap; a
// tap or click pins it open until the next tap, Esc, a scroll or a click
// elsewhere. Only one is ever open: opening one tells the rest to close.
//
// The tooltip text is always in the DOM (`hidden` while closed) and wired to
// the button with aria-describedby, so screen readers get the description
// without opening anything and crawlers see the glossary.
//
// The bubble is position:fixed, placed from the trigger's rect and clamped to
// the viewport, so a card with overflow:hidden can never clip it — which is
// also why it closes on scroll rather than following the page.
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

const OPEN_EVENT = "ciq:infotip-open";
const GAP = 8;
const EDGE = 8;

export function InfoTip({
  title,
  body,
  source,
  label,
  className = "",
}: {
  title: string;
  body: string;
  source?: string;
  /** Accessible name for the trigger; defaults to "What is {title}?". */
  label?: string;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);

  const show = (pin = false) => {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
    setOpen(true);
    if (pin) setPinned(true);
  };
  const hide = () => {
    setOpen(false);
    setPinned(false);
  };

  // One at a time.
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) hide();
    };
    window.addEventListener(OPEN_EVENT, onOther);
    return () => window.removeEventListener(OPEN_EVENT, onOther);
  }, [id]);

  // While open: Esc, scroll and an outside press all close it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        hide();
        btnRef.current?.focus();
      }
    };
    const onScroll = () => hide();
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) hide();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // Place below the trigger, flip above if it would run off the bottom, and
  // keep it inside the viewport horizontally.
  useLayoutEffect(() => {
    if (!open || !btnRef.current || !tipRef.current) {
      setPos(null);
      return;
    }
    const b = btnRef.current.getBoundingClientRect();
    const t = tipRef.current.getBoundingClientRect();
    let top = b.bottom + GAP;
    if (top + t.height > window.innerHeight - EDGE && b.top - GAP - t.height > EDGE) top = b.top - GAP - t.height;
    const left = Math.min(Math.max(b.left - 10, EDGE), window.innerWidth - t.width - EDGE);
    setPos({ top, left });
  }, [open]);

  return (
    <span
      className={`infotip ${className}`}
      ref={wrapRef}
      onMouseEnter={() => show()}
      onMouseLeave={() => {
        if (!pinned) hide();
      }}
    >
      <button
        ref={btnRef}
        type="button"
        className="infotip__btn mono"
        aria-label={label ?? `What is “${title}”?`}
        aria-describedby={id}
        aria-expanded={open}
        onFocus={() => show()}
        onBlur={(e) => {
          if (!pinned && !wrapRef.current?.contains(e.relatedTarget as Node)) hide();
        }}
        onClick={(e) => {
          // Tooltips often sit inside clickable rows; the tap is ours.
          e.stopPropagation();
          e.preventDefault();
          if (open && pinned) hide();
          else show(true);
        }}
      >
        i
      </button>
      <span
        ref={tipRef}
        role="tooltip"
        id={id}
        className="infotip__tip"
        hidden={!open}
        style={pos ? { top: pos.top, left: pos.left } : { visibility: open ? "hidden" : undefined }}
      >
        <span className="infotip__title">{title}</span>
        <span className="infotip__body">{body}</span>
        {source ? <span className="infotip__src mono">{source}</span> : null}
      </span>
    </span>
  );
}
