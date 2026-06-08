// PUBLIC signals index — links to every theme landing page.
import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardBody, Icon } from "@/components/ds";
import { SIGNALS } from "@/lib/signals";
import { PublicShell, PublicCta } from "@/components/public/PublicShell";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "UK company signals — emerging themes & sectors",
  description:
    "Track emerging UK company themes — AI, fintech, cleantech, care, ecommerce and more — with live registrations from Companies House.",
  alternates: { canonical: "/signals" },
  openGraph: { title: "UK company signals — emerging themes & sectors", url: `${SITE_URL}/signals`, type: "website" },
};

export default function SignalsIndex() {
  return (
    <PublicShell>
      <div className="screen">
        <div className="screen-head">
          <div>
            <div className="app-eyebrow">UK company signals</div>
            <h1 className="screen-title">Signals</h1>
          </div>
        </div>
        <p className="public-lede">
          Emerging themes across the UK register — pick a signal to see live companies building in that space.
        </p>

        <div className="public-grid">
          {SIGNALS.map((s) => (
            <Link key={s.slug} href={`/signals/${s.slug}`} style={{ textDecoration: "none" }}>
              <Card className="public-tile">
                <CardBody>
                  <div className="public-tile__head">
                    <h2 className="public-tile__name">{s.key}</h2>
                    <Icon name="arrowRight" size={16} color="var(--accent)" />
                  </div>
                  <p className="public-tile__blurb">{s.blurb}</p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>

        <PublicCta
          title="Turn a signal into a shortlist"
          sub="Create a free account to read full intelligence reports, or upgrade for unlimited reports, alerts and exports."
        />
      </div>
    </PublicShell>
  );
}
