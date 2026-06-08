// PUBLIC markets index — links to every UK regional market page.
import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardBody, Badge, Icon } from "@/components/ds";
import { REGION_STATS } from "@/lib/ons";
import { fmtNumber } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { PublicShell, PublicCta } from "@/components/public/PublicShell";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "UK markets — business data by region",
  description:
    "UK regional business and economic data: population, employment, pay and live company registrations across every region, from Companies House, ONS and Nomis.",
  alternates: { canonical: "/market" },
  openGraph: { title: "UK markets — business data by region", url: `${SITE_URL}/market`, type: "website" },
};

export default function MarketsIndex() {
  const regions = Object.values(REGION_STATS).sort((a, b) => b.growthIndex - a.growthIndex);
  return (
    <PublicShell>
      <div className="screen">
        <div className="screen-head">
          <div>
            <div className="app-eyebrow">UK regional market intelligence</div>
            <h1 className="screen-title">Markets</h1>
          </div>
        </div>
        <p className="public-lede">
          Business and economic data for every UK region — population, employment, pay, growth and live company
          registrations. Pick a region to explore.
        </p>

        <div className="public-grid">
          {regions.map((r) => (
            <Link key={r.region} href={`/market/${slugify(r.region)}`} style={{ textDecoration: "none" }}>
              <Card className="public-tile">
                <CardBody>
                  <div className="public-tile__head">
                    <h2 className="public-tile__name">{r.region}</h2>
                    <Icon name="arrowRight" size={16} color="var(--accent)" />
                  </div>
                  <div className="public-tile__stats">
                    <span>
                      <strong>{fmtNumber(r.population)}</strong> people
                    </span>
                    <span>
                      <strong>{r.employmentRate.toFixed(1)}%</strong> employed
                    </span>
                  </div>
                  <Badge tone={r.growthIndex >= 1 ? "pos" : "neutral"} dot>
                    {r.growthIndex.toFixed(2)}× growth index
                  </Badge>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>

        <PublicCta
          title="From region to company"
          sub="Create a free account to read a full company intelligence report, or upgrade for unlimited access."
        />
      </div>
    </PublicShell>
  );
}
