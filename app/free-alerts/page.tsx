// PUBLIC lead-magnet landing — the canonical home for the free new-company
// alert. Indexable, no login. The opt-in form captures an email (name/company
// optional) and picks a sector/region scope.
import type { Metadata } from "next";
import { FreeAlertForm } from "@/components/FreeAlertForm";
import { PublicShell } from "@/components/public/PublicShell";
import { Icon } from "@/components/ds";

export const metadata: Metadata = {
  title: "Free weekly new-company alerts",
  description:
    "Get a free weekly email of newly registered UK companies in your sector and region — straight from the Companies House register, the week they form.",
  alternates: { canonical: "/free-alerts" },
};

const POINTS = [
  "Newly incorporated companies, the week they register",
  "Filter to your sector and region",
  "Straight from Companies House — no fluff, no fabricated data",
  "Free · no account · unsubscribe any time",
];

export default function FreeAlertsPage() {
  return (
    <PublicShell>
      <section className="screen fa-hero">
        <div className="app-eyebrow">Free weekly email</div>
        <h1 className="fa-hero__title">New UK companies, in your inbox every week</h1>
        <p className="fa-hero__sub">
          Accountants, agencies and sales teams use CompaniesIQ to reach new businesses first. Pick a sector and region
          and we’ll email you the companies that just formed — sourced live from the Companies House register.
        </p>

        <div className="fa-card">
          <FreeAlertForm source="free-alerts-page" />
        </div>

        <ul className="fa-points">
          {POINTS.map((p) => (
            <li key={p}>
              <Icon name="check" size={16} color="var(--accent)" /> {p}
            </li>
          ))}
        </ul>
      </section>
    </PublicShell>
  );
}
