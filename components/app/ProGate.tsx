import Link from "next/link";
import { Icon, Button, type IconName } from "@/components/ds";
import { ENTRY_PAID_PLAN } from "@/lib/subscription";

// Upgrade wall shown to non-subscribers for paid features (watchlists, alerts,
// exports). Free accounts get the public/preview surface; everything here
// requires a paid plan, named from PLANS so the app, the pricing page and the
// Stripe product all say the same word.
export function ProGate({ icon, title, features }: { icon: IconName; title: string; features: string[] }) {
  return (
    <div className="screen">
      <div className="placeholder">
        <span className="placeholder__icon">
          <Icon name={icon} size={28} />
        </span>
        <h1 className="placeholder__title">
          {title} is included in {ENTRY_PAID_PLAN.name}
        </h1>
        <p className="placeholder__sub">
          Upgrade to {ENTRY_PAID_PLAN.name} to unlock {title.toLowerCase()} — plus full intelligence reports, CSV exports and 10-year filing history.
        </p>
        <ul className="progate__list">
          {features.map((f) => (
            <li key={f}>
              <Icon name="check" size={15} color="var(--accent)" /> {f}
            </li>
          ))}
        </ul>
        <Button href="/app/upgrade" variant="primary" iconRight="arrowRight">
          See plans
        </Button>
      </div>
    </div>
  );
}
