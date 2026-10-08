import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ds";
import type { MarketEdition } from "@/lib/research/editions";

/**
 * Commercial Opportunity reports for the markets inside an industry (or an
 * industry in one city). Editions are the latest PUBLISHED ones, looked up at
 * render time, so the links follow each new quarter and never point at a draft.
 * Renders nothing when the industry has no market report yet.
 */
export function MarketReports({ editions, sector, place }: { editions: MarketEdition[]; sector: string; place?: string }) {
  if (!editions.length) return null;
  return (
    <div style={{ marginTop: 18 }}>
      <Card>
        <CardHeader
          subtitle="Commercial opportunity research"
          title={place ? `Market reports: ${sector} in ${place}` : `Market reports in ${sector}`}
        />
        <CardBody>
          <div className="mkt-reports">
            {editions.map((e) => (
              <div className="mkt-report" key={e.slug}>
                <h3 className="mkt-report__name">New {e.market.noun}</h3>
                {e.excerpt ? <p className="mkt-report__body">{e.excerpt}</p> : null}
                <div className="signal-chips">
                  <Link className="signal-chip" href={`/blog/${e.slug}`}>
                    Read the market report →
                  </Link>
                  <Link className="signal-chip" href={e.buildHref}>
                    {place ? `Build the ${place} list →` : "Build this market →"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
