"use client";
import Link from "next/link";
import { useEffect } from "react";
import { FreeAlertForm } from "@/components/FreeAlertForm";
import { track } from "@/lib/track";

// Conversion hook on the PUBLIC company report for logged-out search visitors.
// GSC/GA4 showed these pages get the clicks but visitors grab one fact and
// leave (~23s, no return). Offer a zero-friction, intent-matched next step — a
// free weekly email of new companies in the same sector — capturing the email
// (the lead) instead of demanding an account. View is tracked; the form fires
// generate_lead on submit.
export function TrackCompanyCta({ company, number, sector }: { company: string; number: string; sector?: string }) {
  useEffect(() => {
    track("company_cta_view", { company: number });
  }, [number]);

  const scope = sector ? `new ${sector} companies` : "new UK companies";
  return (
    <div className="company-cta">
      <div className="company-cta__text">
        <span className="company-cta__title">Researching {company}?</span>
        <span className="company-cta__sub">
          Get a free weekly email of {scope} as they’re incorporated — straight from the Companies House register. No
          account, no card.
        </span>
      </div>
      <div className="company-cta__form">
        <FreeAlertForm sector={sector ?? ""} source={`company:${number}`} compact dark />
        <Link
          className="company-cta__link"
          href={`/sign-in?next=${encodeURIComponent(`/company/${number}`)}`}
          onClick={() => track("company_cta_click", { cta: "signup", company: number })}
        >
          Or explore the full platform →
        </Link>
      </div>
    </div>
  );
}
