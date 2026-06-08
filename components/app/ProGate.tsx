import Link from "next/link";
import { Icon, Button, type IconName } from "@/components/ds";

// Upgrade wall shown to non-subscribers for Pro-only features (watchlists,
// alerts, exports). Free accounts get the public/preview surface + one full
// report a month; everything here requires a paid plan.
export function ProGate({ icon, title, features }: { icon: IconName; title: string; features: string[] }) {
  return (
    <div className="screen">
      <div className="placeholder">
        <span className="placeholder__icon">
          <Icon name={icon} size={28} />
        </span>
        <h2 className="placeholder__title">{title} is a Pro feature</h2>
        <p className="placeholder__sub">
          Upgrade to unlock {title.toLowerCase()} — plus unlimited intelligence reports, CSV exports and real-time alerts.
        </p>
        <ul className="progate__list">
          {features.map((f) => (
            <li key={f}>
              <Icon name="check" size={15} color="var(--accent)" /> {f}
            </li>
          ))}
        </ul>
        <Link href="/app/upgrade">
          <Button variant="primary" iconRight="arrowRight">
            See plans
          </Button>
        </Link>
      </div>
    </div>
  );
}
