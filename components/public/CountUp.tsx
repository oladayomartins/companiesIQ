"use client";
// Count-up for a headline figure.
//
// The number is passed in and rendered as text by the server, so the real value
// is in the HTML on first paint — this never renders a placeholder or a zero and
// fills it in later. That matters twice over: the figure is the thing the page
// is about (so it must survive JS being off or slow), and animating an LCP
// element before it paints is exactly what the motion spec forbids.
//
// The animation therefore starts FROM the already-painted value: on mount we
// read what is on screen, count from a lower bound up to it, and stop. If the
// hook never runs, the correct number was already there.
import { useEffect, useRef, useState } from "react";
import { fmtNumber } from "@/lib/format";

const DURATION = 900;

// Formatting lives here rather than arriving as a prop: a function cannot cross
// the server/client boundary, and the formatter must match what the server
// rendered exactly or the number would visibly reformat when the animation ends.
export function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState<string | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Respect the setting before doing anything at all.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Fire once per page view, and only when the figure is actually on screen —
    // a count-up the visitor scrolled past already is just a layout risk.
    let raf = 0;
    let cancelled = false;
    const el = ref.current;
    if (!el) return;

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const t = Math.min((now - start) / DURATION, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(fmtNumber(Math.round(value * eased)));
        if (t < 1) raf = requestAnimationFrame(tick);
        else setDisplay(null); // hand the exact server value back
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          run();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [value]);

  // Tabular numerals come from the stylesheet, so the width cannot change as
  // digits tick over and the animation is CLS-free.
  return <span ref={ref}>{display ?? fmtNumber(value)}</span>;
}
