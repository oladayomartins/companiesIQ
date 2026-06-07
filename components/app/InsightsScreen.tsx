"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody, Icon, Badge, Button, StatusPill, CompanyAvatar } from "@/components/ds";
import { FactualTags } from "@/components/app/Tags";
import { slugify } from "@/lib/slug";
import { fmtDelta, fmtNumber } from "@/lib/format";
import type { EnrichedResult } from "@/lib/data";

interface InsightsData {
  parsed: { region?: string; sector?: string; status: string[]; source: string } | null;
  results: EnrichedResult[];
  live: boolean;
  industries: { sector: string; growth: number }[];
  fastestRegions: { region: string; growthIndex: number; pay: number }[];
  topRegions: { key: string; label: string; count: number; share: number }[];
  topSics: { key: string; label: string; count: number; share: number }[];
}

const EXAMPLES = ["care companies in London", "software companies", "construction firms in Scotland", "new technology companies"];

function RankRow({ rank, name, sub, value }: { rank: number; name: string; sub?: string; value: string }) {
  return (
    <div className="alert-row">
      <span className="hotspot__rank">{rank}</span>
      <div className="alert-row__main">
        <div className="alert-row__name">{name}</div>
        {sub ? <div className="alert-row__rule">{sub}</div> : null}
      </div>
      <span className="hotspot__val">{value}</span>
    </div>
  );
}

export function InsightsScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(query = "") {
    setLoading(true);
    try {
      const res = await fetch(`/api/insights${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  // initial aggregates load
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Insights</div>
          <h1 className="screen-title">What&apos;s happening in the market</h1>
        </div>
        <Badge tone="pos" dot>
          Live · Companies House + ONS
        </Badge>
      </div>

      <form
        className="nl-bar"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) load(q.trim());
        }}
      >
        <Icon name="search" size={18} />
        <input placeholder="Ask in plain English — “care companies in London”" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="primary" type="submit" disabled={loading}>
          Search
        </Button>
      </form>
      <div className="signal-chips" style={{ marginTop: 12 }}>
        <span className="sort-label">Try</span>
        {EXAMPLES.map((ex) => (
          <button key={ex} className="signal-chip" style={{ cursor: "pointer" }} onClick={() => { setQ(ex); load(ex); }}>
            {ex}
          </button>
        ))}
      </div>

      {data?.parsed ? (
        <>
          <div className="nl-parsed">
            <span className="nl-parsed__label">Interpreted as</span>
            {data.parsed.sector ? <Badge tone="info">{data.parsed.sector}</Badge> : null}
            {data.parsed.region ? <Badge tone="pos">{data.parsed.region}</Badge> : null}
            {data.parsed.status.map((s) => (
              <Badge key={s} tone="neutral">
                {s}
              </Badge>
            ))}
            <Badge tone={data.parsed.source === "llm" ? "accent" : "neutral"} dot>
              {data.parsed.source === "llm" ? "AI parsing" : "Rule-based"}
            </Badge>
          </div>
          <Card variant="flat" style={{ marginTop: 8 }}>
            <CardBody flush>
              <div className="table-scroll"><table className="data-table data-table--full">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Tags</th>
                    <th>Region</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.length ? (
                    data.results.map((c) => (
                      <tr key={c.number} onClick={() => router.push(`/app/company/${c.number}`)}>
                        <td>
                          <div className="cell-co">
                            <CompanyAvatar name={c.name} size="md" />
                            <div>
                              <div className="cell-co__name">{c.name}</div>
                              <div className="cell-co__no">{c.number}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <StatusPill status={c.status} />
                        </td>
                        <td>
                          <FactualTags incorporated={c.incorporated} sector={c.classification?.sector} sicCodes={c.sicCodes} status={c.status} />
                        </td>
                        <td className="muted">{c.region ?? "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="empty-row">
                      <td colSpan={4}>No matches — try a broader phrase.</td>
                    </tr>
                  )}
                </tbody>
              </table></div>
            </CardBody>
          </Card>
        </>
      ) : null}

      <div className="dash-cols" style={{ marginTop: 18 }}>
        <Card>
          <CardHeader subtitle="ONS · trailing 12 months" title="Trending industries" action={<Badge tone="accent" dot>Growth</Badge>} />
          <CardBody flush>
            {(data?.industries ?? []).map((s, i) => (
              <Link key={s.sector} href={`/app/industries/${slugify(s.sector)}`} className="alert-row" style={{ textDecoration: "none" }}>
                <span className="hotspot__rank">{i + 1}</span>
                <div className="alert-row__main">
                  <div className="alert-row__name">{s.sector}</div>
                  <div className="alert-row__rule">Open industry report</div>
                </div>
                <span className="hotspot__val">{fmtDelta(s.growth)}</span>
              </Link>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader subtitle="Nomis" title="Fastest-growing regions" />
          <CardBody flush>
            {(data?.fastestRegions ?? []).map((r, i) => (
              <RankRow key={r.region} rank={i + 1} name={r.region} sub={`Median weekly pay £${fmtNumber(r.pay)}`} value={`${r.growthIndex.toFixed(2)}×`} />
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="dash-cols" style={{ marginTop: 18 }}>
        <Card>
          <CardHeader subtitle="Live · last 30 days" title="Most active regions" />
          <CardBody flush>
            {(data?.topRegions ?? []).map((r, i) => (
              <RankRow key={r.key} rank={i + 1} name={r.label} value={`${r.count}`} />
            ))}
            {!loading && !(data?.topRegions?.length) ? <div className="alert-row"><span className="muted">No sample available.</span></div> : null}
          </CardBody>
        </Card>
        <Card>
          <CardHeader subtitle="Live · last 30 days" title="Most-registered SIC codes" />
          <CardBody flush>
            {(data?.topSics ?? []).map((s, i) => (
              <RankRow key={s.key} rank={i + 1} name={s.label} sub={`SIC ${s.key}`} value={`${s.count}`} />
            ))}
          </CardBody>
        </Card>
      </div>
      <div className="report__disclaimer">
        Industries &amp; survival from ONS reference; regional indicators from Nomis (live); company data &amp; activity counts from
        Companies House (live). Natural-language parsing is rule-based, or Claude when an API key is configured.
      </div>
    </div>
  );
}
