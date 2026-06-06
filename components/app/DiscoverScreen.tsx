"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody, Icon, Badge, Button, StatusPill, CompanyAvatar } from "@/components/ds";
import { ScorePill, KeywordChips } from "@/components/app/ScorePill";
import type { ParsedQuery } from "@/lib/nl-search";
import type { EnrichedResult } from "@/lib/data";
import { fmtDelta, fmtNumber } from "@/lib/format";

interface DiscoverData {
  parsed: ParsedQuery;
  results: EnrichedResult[];
  live: boolean;
  niches: { sector: string; growth: number }[];
  signals: { key: string; count: number }[];
  hotspots: { region: string; growthIndex: number; pay: number }[];
}

const EXAMPLES = ["AI companies in London", "Fintech startups", "Healthcare in Scotland", "Solar energy companies"];

export function DiscoverScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [data, setData] = useState<DiscoverData | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(query: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/discover?q=${encodeURIComponent(query)}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) run(q.trim());
  }

  const parsedChips: { label: string; tone: "accent" | "info" | "pos" | "neutral" }[] = data
    ? [
        ...data.parsed.keywords.map((k) => ({ label: k, tone: "accent" as const })),
        ...(data.parsed.sector ? [{ label: data.parsed.sector, tone: "info" as const }] : []),
        ...(data.parsed.region ? [{ label: data.parsed.region, tone: "pos" as const }] : []),
        ...data.parsed.status.map((s) => ({ label: s, tone: "neutral" as const })),
      ]
    : [];

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Discovery</div>
          <h1 className="screen-title">Ask the register</h1>
        </div>
        {data ? (
          <Badge tone={data.parsed.source === "llm" ? "accent" : "neutral"} dot>
            {data.parsed.source === "llm" ? "AI parsing" : "Rule-based parsing"}
          </Badge>
        ) : null}
      </div>

      <div className="discover-hero">
        <span className="discover-hero__label">Natural-language search</span>
        <p className="discover-hero__text">
          Describe what you&apos;re looking for in plain English — CompaniesIQ resolves it to sector, region, keyword and
          status filters, then ranks matches by opportunity score.
        </p>
      </div>

      <form className="nl-bar" onSubmit={submit}>
        <Icon name="search" size={18} />
        <input placeholder="Try “AI companies in London”" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? "Reading…" : "Discover"}
        </Button>
      </form>

      <div className="signal-chips" style={{ marginTop: 12 }}>
        <span className="sort-label">Try</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            className="signal-chip"
            onClick={() => {
              setQ(ex);
              run(ex);
            }}
            style={{ cursor: "pointer" }}
          >
            {ex}
          </button>
        ))}
      </div>

      {data ? (
        <>
          <div className="nl-parsed">
            <span className="nl-parsed__label">Interpreted as</span>
            {parsedChips.length ? (
              parsedChips.map((c) => (
                <Badge key={c.label} tone={c.tone}>
                  {c.label}
                </Badge>
              ))
            ) : (
              <span className="muted">no specific filters — showing best matches</span>
            )}
            {!data.live ? <Badge tone="warn">Sample data</Badge> : null}
          </div>

          <Card variant="flat" style={{ marginTop: 8 }}>
            <CardBody flush>
              <table className="data-table data-table--full">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Signals</th>
                    <th>Region</th>
                    <th className="num">
                      Opportunity <span className="pro-tag">Pro</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan={5}>No matches — try a broader phrase.</td>
                    </tr>
                  ) : (
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
                          <KeywordChips keywords={c.keywords} strong={c.score?.keywords ?? []} />
                        </td>
                        <td className="muted">{c.region ?? "—"}</td>
                        <td className="num">
                          <ScorePill score={c.score} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </>
      ) : null}

      <div className="dash-cols" style={{ marginTop: 18 }}>
        <Card>
          <CardHeader subtitle="AI discovery" title="Emerging niches" action={<Badge tone="accent" dot>Trending</Badge>} />
          <CardBody flush>
            <div className="hotspot-grid" style={{ gridTemplateColumns: "1fr", gap: 0 }}>
              {(data?.niches ?? []).map((n, i) => (
                <div className="alert-row" key={n.sector}>
                  <span className="hotspot__rank">{i + 1}</span>
                  <div className="alert-row__main">
                    <div className="alert-row__name">{n.sector}</div>
                    <div className="alert-row__rule">Fastest-growing by formation rate</div>
                  </div>
                  <span className="hotspot__val">{fmtDelta(n.growth)}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader subtitle="Nomis" title="Regional hotspots" />
          <CardBody flush>
            <div className="hotspot-grid" style={{ gridTemplateColumns: "1fr", gap: 0 }}>
              {(data?.hotspots ?? []).map((h, i) => (
                <div className="alert-row" key={h.region}>
                  <span className="hotspot__rank">{i + 1}</span>
                  <div className="alert-row__main">
                    <div className="alert-row__name">{h.region}</div>
                    <div className="alert-row__rule">Median weekly pay £{fmtNumber(h.pay)}</div>
                  </div>
                  <span className="hotspot__val">{h.growthIndex.toFixed(2)}×</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
      <div className="report__disclaimer">
        Niches derived from ONS formation-rate data; hotspots from Nomis regional growth indices. Natural-language parsing
        runs rule-based by default, or via Claude Haiku when an Anthropic API key is configured.
      </div>
    </div>
  );
}
