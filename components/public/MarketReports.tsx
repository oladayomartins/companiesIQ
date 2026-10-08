import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ds";
import type { MarketEdition } from "@/lib/research/editions";

/**
 * Commercial Opportunity reports for the markets inside an industry (or an
 * industry in one city). Editions are the latest PUBLISHED ones, looked up at
 * render time, so the links follow each new quarter and never point at a draft.
 * Renders nothing when the industry has no market report yet.
 */
export function MarketReports({
  editions,
  sector,
  place,
  title,
  compact = false,
}: {
  editions: MarketEdition[];
  sector?: string;
  place?: string;
  /** Overrides the default heading. */
  title?: string;
  /** One line per market with the place's own figure instead of the national summary. */
  compact?: boolean;
}) {
  if (!editions.length) return null;
  return (
    <div style={{ marginTop: 18 }}>
      <Card>
        <CardHeader
          subtitle="Commercial opportunity research"
          title={title ?? (place ? `Market reports: ${sector} in ${place}` : `Market reports in ${sector}`)}
        />
        <CardBody>
          <div className="mkt-reports">
            {editions.map((e) => (
              <div className="mkt-report" key={e.slug}>
                <h3 className="mkt-report__name">New {e.market.noun}</h3>
                {compact && e.regionTowns && e.placeCount != null ? (
                  <p className="mkt-report__body">
                    {e.regionTowns.length === 1
                      ? `${e.placeCount.toLocaleString("en-GB")} registered in ${e.regionTowns[0].name} in ${e.periodLabel ?? "the latest quarter"}.`
                      : `${e.placeCount.toLocaleString("en-GB")} registered across the ${e.regionTowns.length} towns we measure in ${place} in ${
                          e.periodLabel ?? "the latest quarter"
                        }: ${e.regionTowns.map((t) => `${t.name} ${t.count.toLocaleString("en-GB")}`).join(" · ")}.`}
                  </p>
                ) : compact && place && e.placeCount != null ? (
                  <p className="mkt-report__body">
                    {e.placeCount > 0
                      ? `${e.placeCount.toLocaleString("en-GB")} registered in ${place} in ${e.periodLabel ?? "the latest quarter"}.`
                      : `None registered in ${place} in ${e.periodLabel ?? "the latest quarter"}.`}
                  </p>
                ) : e.excerpt && !compact ? (
                  <p className="mkt-report__body">{e.excerpt}</p>
                ) : null}
                <div className="signal-chips">
                  <Link className="signal-chip" href={`/blog/${e.slug}`}>
                    Read the market report →
                  </Link>
                  {e.regionTowns ? (
                    e.regionTowns
                      .filter((t) => t.count > 0)
                      .slice(0, 3)
                      .map((t) => (
                        <Link key={t.name} className="signal-chip" href={t.buildHref}>
                          {`Build the ${t.name} list →`}
                        </Link>
                      ))
                  ) : (
                    <Link className="signal-chip" href={e.buildHref}>
                      {place ? `Build the ${place} list →` : "Build this market →"}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
