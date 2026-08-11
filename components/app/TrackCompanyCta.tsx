"use client";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ds";
import { track } from "@/lib/track";

// Conversion hook on the PUBLIC company report for logged-out search visitors.
// GSC/GA4 showed these pages get the clicks but the visitor grabs one fact and
// leaves (≈23s, no return). This offers an intent-matched next step — free
// account into the new-formations dashboard — and measures view + click in GA4.
export function TrackCompanyCta({ company, number, sector }: { company: string; number: string; sector?: string }) {
  useEffect(() => {
    track("company_cta_view", { company: number });
  }, [number]);

  const next = `/company/${number}`;
  return (
    <div className="company-cta">
      <div className="company-cta__text">
        <span className="company-cta__title">Researching {company}?</span>
        <span className="company-cta__sub">
          CompaniesIQ tracks every UK company as it forms{sector ? ` — including new ${sector} businesses` : ""}. Create a
          free account to search the live register and watch companies for changes. No card required.
        </span>
      </div>
      <div className="company-cta__actions">
        <Link href={`/sign-in?next=${encodeURIComponent(next)}`} onClick={() => track("company_cta_click", { cta: "signup", company: number })}>
          <Button variant="primary" iconRight="arrowRight">
            Start free
          </Button>
        </Link>
        <Link
          className="company-cta__link"
          href="/search"
          onClick={() => track("company_cta_click", { cta: "explore", company: number })}
        >
          Explore new companies →
        </Link>
      </div>
    </div>
  );
}
