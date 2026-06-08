// PUBLIC industries index — links to every sector landing page.
import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardBody, Badge, Icon } from "@/components/ds";
import { SECTOR_STATS } from "@/lib/ons";
import { fmtNumber, fmtDelta } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { PublicShell, PublicCta } from "@/components/public/PublicShell";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "UK industries — company data by sector",
  description:
    "Browse UK industries by sector: active companies, new registrations, growth and survival benchmarks from Companies House, ONS and Nomis.",
  alternates: { canonical: "/industry" },
  openGraph: { title: "UK industries — company data by sector", url: `${SITE_URL}/industry`, type: "website" },
};

export default function IndustriesIndex() {
  const sectors = Object.values(SECTOR_STATS).sort((a, b) => b.businesses - a.businesses);
  return (
    <PublicShell>
      <div className="screen">
        <div className="screen-head">
          <div>
            <div className="app-eyebrow">UK industry intelligence</div>
            <h1 className="screen-title">Industries</h1>
          </div>
        </div>
        <p className="public-lede">
          Live company data for every major UK sector — active companies, new registrations, growth and survival
          benchmarks. Pick a sector to dig in.
        </p>

        <div className="public-grid">
          {sectors.map((s) => (
            <Link key={s.sector} href={`/industry/${slugify(s.sector)}`} style={{ textDecoration: "none" }}>
              <Card className="public-tile">
                <CardBody>
                  <div className="public-tile__head">
                    <h2 className="public-tile__name">{s.sector}</h2>
                    <Icon name="arrowRight" size={16} color="var(--accent)" />
                  </div>
                  <div className="public-tile__stats">
                    <span>
                      <strong>{fmtNumber(s.businesses)}</strong> active
                    </span>
                    <span>
                      <strong>{fmtNumber(s.newLastYear)}</strong> new (12m)
                    </span>
                  </div>
                  <Badge tone={s.annualGrowth >= 5 ? "pos" : "neutral"} dot>
                    {fmtDelta(s.annualGrowth)} annual growth
                  </Badge>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>

        <PublicCta
          title="Go deeper than the sector"
          sub="Create a free account to read a full company intelligence report, or upgrade for unlimited access."
        />
      </div>
    </PublicShell>
  );
}
