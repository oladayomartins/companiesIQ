"use client";
// "In short" — the brief, pinned under the header with the tab bar.
//
// Collapsed it is one sentence; expanded it is the full brief and its three
// points. The expanded body is always in the server HTML (`hidden`, not
// unmounted), so the toggle is an enhancement over content that is already
// there. It folds itself away once the reader scrolls ~140px from where they
// opened it, so it never sits on top of the thing they scrolled down to read.
//
// When the reader has hit the free-account gate, the bar keeps only the first
// sentence (market context, not the derived read) and the brief itself stays
// behind the gate on the Intelligence tab.
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ds";
import type { Brief } from "@/lib/lens-view";

const COLLAPSE_AFTER = 140;

/** The brief's first sentence. Splits on ". " so "3.1%" never cuts it short. */
export function firstSentence(prose: string): string {
  const i = prose.indexOf(". ");
  return i === -1 ? prose : prose.slice(0, i + 1);
}

export function SummaryBar({
  brief,
  audience,
  locked,
  unlockHref,
  onViewEvidence,
  children,
}: {
  brief: Brief;
  audience: string;
  /** Reader is behind the free-account gate: no expand, show the ask instead. */
  locked: boolean;
  unlockHref: string;
  onViewEvidence: () => void;
  /** The tab bar, which shares the sticky stack. */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openedAt = useRef(0);
  const bodyId = useId();

  // Sit exactly under the report header, whatever height it wrapped to.
  useEffect(() => {
    const head = document.querySelector<HTMLElement>(".rep-head");
    if (!head) return;
    const set = () => document.documentElement.style.setProperty("--rep-head-h", `${head.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(head);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => {
      if (Math.abs(window.scrollY - openedAt.current) > COLLAPSE_AFTER) setOpen(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  const toggle = () => {
    openedAt.current = window.scrollY;
    setOpen((v) => !v);
  };

  return (
    <div className="sumstack">
      <div className={`sumbar${open ? " is-open" : ""}`}>
        <div className="sumbar__row">
          <span className="sumbar__label">
            <span className="sumbar__title">In short</span>
            <span className="sumbar__for mono">for {audience}</span>
          </span>
          <span className="sumbar__short">{firstSentence(brief.prose)}</span>
          {locked ? (
            <Link className="sumbar__btn" href={unlockHref}>
              Read the full summary <Icon name="arrowRight" size={13} />
            </Link>
          ) : (
            <button type="button" className="sumbar__btn" aria-expanded={open} aria-controls={bodyId} onClick={toggle}>
              {open ? "Collapse" : "Full summary"}
              <Icon name="chevronDown" size={13} className="sumbar__chev" />
            </button>
          )}
        </div>
        {locked ? null : (
          <div className="sumbar__body" id={bodyId} hidden={!open}>
            <p className="sumbar__prose">{brief.prose}</p>
            <div className="sumbar__points">
              {brief.points.map((p) => (
                <div className={`sumbar__point is-${p.tone}`} key={p.n}>
                  <span className="sumbar__dot" aria-hidden="true" />
                  <div>
                    <div className="sumbar__ptitle">{p.title}</div>
                    <div className="sumbar__ptext">{p.text}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="sumbar__foot">
              <button
                type="button"
                className="sumbar__evidence"
                onClick={() => {
                  setOpen(false);
                  onViewEvidence();
                }}
              >
                View evidence <Icon name="arrowRight" size={13} />
              </button>
              <span className="sumbar__disclaimer mono">Interpretation, not advice</span>
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
