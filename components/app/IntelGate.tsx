"use client";
// The registration gate on a public company report.
//
// Three tiers, one ladder:
//   anonymous  the register facts and the headline score stay open; the derived
//              intelligence is blurred behind "create a free account"
//   free       all of that intelligence, for real, plus an upgrade prompt for
//              the deep report
//   pro        everything
//
// The gated content stays in the DOM rather than being swapped for a skeleton.
// This page is the SEO surface — the prose and figures are what it ranks on, and
// removing them server-side would cost far more than the gate gains. What is
// behind the blur is our own derived analysis of public register data, not
// anyone's private information, so having it in the HTML is not a disclosure
// problem the way hidden personal data would be.
//
// It is genuinely inert while gated. `inert` (React 19) is what does the work:
// it removes the whole subtree from the tab order and the accessibility tree in
// one go. pointer-events:none alone only stops the mouse — a keyboard user would
// still tab through every link behind the blur, which is worse than no gate.
import Link from "next/link";
import { Button, Icon, Badge } from "@/components/ds";

export function IntelGate({
  title,
  sub,
  ctaLabel,
  ctaHref,
  secondary,
  badge,
  children,
}: {
  title: string;
  sub: string;
  ctaLabel: string;
  ctaHref: string;
  secondary?: { label: string; href: string };
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <div className="intelgate">
      <div className="intelgate__veil" inert>
        {children}
      </div>
      <div className="intelgate__panel">
        <span className="intelgate__icon" aria-hidden="true">
          <Icon name="shield" size={22} />
        </span>
        <Badge tone="accent" dot>
          {badge}
        </Badge>
        <h2 className="intelgate__title">{title}</h2>
        <p className="intelgate__sub">{sub}</p>
        <div className="intelgate__cta">
          <Link href={ctaHref}>
            <Button variant="primary" iconRight="arrowRight">
              {ctaLabel}
            </Button>
          </Link>
          {secondary ? (
            <Link href={secondary.href}>
              <Button variant="secondary">{secondary.label}</Button>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
