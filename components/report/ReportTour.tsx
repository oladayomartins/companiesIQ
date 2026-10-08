"use client";
// First-visit guidance for the company report: a welcome strip, and a short
// tour that spotlights four parts of the page in turn.
//
// Client-only by design. Nothing here is content — it points at content that
// is already in the server HTML — so it renders nothing until after
// hydration, and never for a crawler. Seen-state lives on the profile for a
// signed-in reader (so it doesn't reappear on another device) and in
// localStorage otherwise. "How to read this" in the report header replays it
// by dispatching REPLAY_EVENT.
//
// The spotlight is a fixed box over the target with a huge box-shadow as the
// dimmer, so no target needs its z-index raised (several sit inside sticky or
// isolated stacking contexts). Steps whose target is behind the registration
// gate are skipped — pointing at blurred content explains nothing.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { TOUR, WELCOME_HINTS, type TourTarget } from "@/lib/glossary";

export const REPLAY_EVENT = "ciq:report-tour";
const LS_KEY = "ciq.report-tour.v1";
const PAD = 6;

type Rect = { top: number; left: number; width: number; height: number };

function target(t: TourTarget): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${t}"]`);
  if (!el || el.closest(".intelgate__veil")) return null;
  return el;
}

/** Height of the sticky header + "In short" stack, so targets land below it. */
function stickyOffset(): number {
  const head = document.querySelector<HTMLElement>(".rep-head")?.offsetHeight ?? 64;
  const stack = document.querySelector<HTMLElement>(".sumstack")?.offsetHeight ?? 0;
  return head + stack + 16;
}

export function ReportTour({
  signedIn,
  seenOnServer,
  audience,
  onBeforeStart,
}: {
  signedIn: boolean;
  /** From profiles.report_tour_at; null when unknown (not signed in / column missing). */
  seenOnServer: boolean | null;
  audience: string;
  /** Called before the first step — the report switches to the Intelligence tab. */
  onBeforeStart: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [liveCount, setLiveCount] = useState(TOUR.length);
  const [steps, setSteps] = useState<typeof TOUR>([]);
  const [i, setI] = useState(-1); // -1 = not touring
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  // Decide after mount only: the server HTML is identical for every reader.
  useEffect(() => {
    let seen = !!seenOnServer;
    try {
      seen = seen || !!localStorage.getItem(LS_KEY);
    } catch {
      /* private mode: show it, it just won't remember */
    }
    // A gated reader can only tour what isn't blurred; offer the strip only
    // when the tour has something real to show.
    const live = TOUR.filter((s) => target(s.target)).length;
    setLiveCount(live);
    setWelcome(!seen && live >= 2);
    setReady(true);
  }, [seenOnServer]);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(LS_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    if (signedIn) {
      fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ report_tour_seen: true }),
      }).catch(() => {});
    }
  }, [signedIn]);

  const start = useCallback(() => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    onBeforeStart();
    setWelcome(false);
    // Wait a frame for the Intelligence panel to be visible before measuring.
    requestAnimationFrame(() => {
      const live = TOUR.filter((s) => target(s.target));
      if (!live.length) return;
      setSteps(live);
      setI(0);
    });
  }, [onBeforeStart]);

  const end = useCallback(() => {
    setI(-1);
    setRect(null);
    markSeen();
    returnFocus.current?.focus?.();
  }, [markSeen]);

  // Replay from the header.
  useEffect(() => {
    const onReplay = () => start();
    window.addEventListener(REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_EVENT, onReplay);
  }, [start]);

  // Scroll the step's target under the sticky stack, then track its rect.
  useEffect(() => {
    if (i < 0 || !steps[i]) return;
    const el = target(steps[i].target);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const y = el.getBoundingClientRect().top + window.scrollY - stickyOffset();
    window.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
      });
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    nextRef.current?.focus();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [i, steps]);

  // Keys while touring: Esc ends, arrows step, Tab stays inside the card.
  useEffect(() => {
    if (i < 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        end();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (i >= steps.length - 1) end();
        else setI(i + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (i > 0) setI(i - 1);
      } else if (e.key === "Tab" && cardRef.current) {
        const f = [...cardRef.current.querySelectorAll<HTMLElement>("button")];
        if (!f.length) return;
        const at = f.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        f[(at + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [i, steps.length, end]);

  // Card placement: below the target if it fits, else above, else pinned to
  // the bottom of the viewport (tall targets, phones).
  const [cardPos, setCardPos] = useState<React.CSSProperties>({});
  useLayoutEffect(() => {
    if (!rect || !cardRef.current) return;
    const c = cardRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(rect.left, 12), vw - c.width - 12);
    if (vw < 640) setCardPos({ left: 12, right: 12, bottom: 12 });
    else if (rect.top + rect.height + 12 + c.height < vh - 12) setCardPos({ top: rect.top + rect.height + 12, left });
    else if (rect.top - 12 - c.height > stickyOffset() - 16) setCardPos({ top: rect.top - 12 - c.height, left });
    else setCardPos({ bottom: 16, left });
  }, [rect]);

  if (!ready) return null;

  const step = i >= 0 ? steps[i] : null;

  return (
    <>
      {welcome && !step ? (
        <section className="tourwelcome" aria-label="How to read this report">
          <div className="tourwelcome__main">
            <h2 className="tourwelcome__title">First company report? Here&rsquo;s how to read it in under a minute.</h2>
            <ul className="tourwelcome__hints">
              {WELCOME_HINTS.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
          <div className="tourwelcome__cta">
            <button type="button" className="tourbtn tourbtn--primary" onClick={start}>
              Take the {liveCount}-step tour
            </button>
            <button
              type="button"
              className="tourbtn"
              onClick={() => {
                setWelcome(false);
                markSeen();
              }}
            >
              I&rsquo;ll explore
            </button>
          </div>
        </section>
      ) : null}

      {step ? (
        <>
          <div className="tour__catch" onClick={end} aria-hidden="true" />
          {rect ? (
            <div
              className="tour__spot"
              aria-hidden="true"
              style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
            />
          ) : null}
          <div
            ref={cardRef}
            className="tour__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            aria-describedby="tour-body"
            style={cardPos}
          >
            <div className="tour__step mono">
              Step {i + 1} of {steps.length}
            </div>
            <h2 className="tour__title" id="tour-title">
              {step.title}
            </h2>
            <p className="tour__body" id="tour-body">
              {step.body(audience)}
            </p>
            <div className="tour__foot">
              {i === 0 ? (
                <button type="button" className="tour__link" onClick={end}>
                  Skip tour
                </button>
              ) : (
                <button type="button" className="tour__link" onClick={() => setI(i - 1)}>
                  Back
                </button>
              )}
              <button
                type="button"
                ref={nextRef}
                className="tourbtn tourbtn--primary"
                onClick={() => (i >= steps.length - 1 ? end() : setI(i + 1))}
              >
                {i >= steps.length - 1 ? "Got it" : "Next →"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
