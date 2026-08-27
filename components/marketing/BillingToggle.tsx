"use client";
import { useId } from "react";
import { Badge } from "@/components/ds";

// Monthly vs annual is a choice between two named options, not an on/off
// state — a switch leaves "off" meaning "monthly", which nothing announces.
// Native radios in a labelled group give arrow-key navigation and an
// accessible name for each option for free.
export function BillingToggle({
  annual,
  onChange,
  saving = "Save 20%",
}: {
  annual: boolean;
  onChange: (annual: boolean) => void;
  saving?: string;
}) {
  const name = useId();
  return (
    <div className="bill-toggle">
      <div className="bill-toggle__seg" role="radiogroup" aria-label="Billing period">
        <label className="bill-toggle__opt">
          <input type="radio" name={name} checked={!annual} onChange={() => onChange(false)} />
          <span>Monthly</span>
        </label>
        <label className="bill-toggle__opt">
          <input type="radio" name={name} checked={annual} onChange={() => onChange(true)} />
          <span>Annual</span>
        </label>
      </div>
      <Badge tone="pos">{saving}</Badge>
    </div>
  );
}
