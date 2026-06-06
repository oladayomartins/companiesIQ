"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody, Checkbox, Tag, StatusPill, Badge, CompanyAvatar, Icon, Select, IconButton, Button, Tabs } from "@/components/ds";
import { ScorePill, KeywordChips } from "@/components/app/ScorePill";
import { ExplorerGrid } from "@/components/app/ExplorerGrid";
import { fmtNumber, ageLabel } from "@/lib/format";
import type { EnrichedResult } from "@/lib/data";
import type { KeywordSignal } from "@/lib/keywords";
import { toCSV, downloadCSV } from "@/lib/csv";

type StatusKey = "active" | "dormant" | "liquidation" | "dissolved";
const REGIONS = ["London", "South East", "Scotland", "North West"];
const INC_WINDOWS: { label: string; value: string }[] = [
  { label: "Any time", value: "any" },
  { label: "Last 12 months", value: "12m" },
  { label: "Last 5 years", value: "5y" },
];

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="filter-group">
      <div className="filter-group__head">{title}</div>
      <div className="filter-group__body">{children}</div>
    </div>
  );
}

export function SearchScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q") ?? "";

  const [status, setStatus] = useState<Record<StatusKey, boolean>>({ active: true, dormant: false, dissolved: false, liquidation: false });
  const [regions, setRegions] = useState<Record<string, boolean>>({});
  const [incWindow, setIncWindow] = useState("any");
  const [sort, setSort] = useState("score");
  const [view, setView] = useState("table");
  const [data, setData] = useState<{ total: number; results: EnrichedResult[]; live: boolean; keywords: KeywordSignal[] }>({ total: 0, results: [], live: false, keywords: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeStatuses = useMemo(() => (Object.keys(status) as StatusKey[]).filter((k) => status[k]), [status]);
  const activeRegions = useMemo(() => REGIONS.filter((r) => regions[r]), [regions]);
  const [chips, setChips] = useState<string[]>(query ? [query] : []);
  useEffect(() => setChips(query ? [query] : []), [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    activeStatuses.forEach((s) => sp.append("status", s));
    if (incWindow !== "any") sp.set("incorporated", incWindow);
    fetch(`/api/search?${sp.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        setData({ total: d.total ?? 0, results: d.results ?? [], live: !!d.live, keywords: d.keywords ?? [] });
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query, activeStatuses, incWindow]);

  const rows = useMemo(() => {
    let r = data.results;
    if (activeRegions.length) r = r.filter((x) => x.region && activeRegions.includes(x.region));
    r = [...r];
    if (sort === "name") r.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "inc") r.sort((a, b) => (b.incorporated || "").localeCompare(a.incorporated || ""));
    else if (sort === "score") r.sort((a, b) => (b.score?.total ?? 0) - (a.score?.total ?? 0));
    return r;
  }, [data.results, activeRegions, sort]);

  function exportCsv() {
    const csv = toCSV(
      ["Company", "Number", "Incorporated", "Status", "Region", "SIC", "Category", "Keywords", "Opportunity score", "Band"],
      rows.map((c) => [
        c.name,
        c.number,
        c.incorporated ?? "",
        c.status,
        c.region ?? "",
        c.sicCodes[0] ?? "",
        c.classification?.category ?? "",
        (c.keywords ?? []).join(" | "),
        c.score?.total ?? "",
        c.score?.band ?? "",
      ])
    );
    downloadCSV(`companiesiq-prospects-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="screen search-screen">
      <aside className="filters">
        <div className="filters__head">
          <span className="app-eyebrow">Refine</span>
          <button
            className="link-btn"
            onClick={() => {
              setStatus({ active: true, dormant: false, dissolved: false, liquidation: false });
              setRegions({});
              setIncWindow("any");
              setChips([]);
              router.push("/app/search");
            }}
          >
            Reset
          </button>
        </div>
        <FilterGroup title="Company status">
          <Checkbox label="Active" checked={status.active} onChange={(e) => setStatus((s) => ({ ...s, active: e.target.checked }))} />
          <Checkbox label="Dormant" checked={status.dormant} onChange={(e) => setStatus((s) => ({ ...s, dormant: e.target.checked }))} />
          <Checkbox label="In liquidation" checked={status.liquidation} onChange={(e) => setStatus((s) => ({ ...s, liquidation: e.target.checked }))} />
          <Checkbox label="Dissolved" checked={status.dissolved} onChange={(e) => setStatus((s) => ({ ...s, dissolved: e.target.checked }))} />
        </FilterGroup>
        <FilterGroup title="Region">
          {REGIONS.map((r) => (
            <Checkbox key={r} label={r} checked={!!regions[r]} onChange={(e) => setRegions((s) => ({ ...s, [r]: e.target.checked }))} />
          ))}
        </FilterGroup>
        <FilterGroup title="Incorporated">
          <Select size="sm" value={incWindow} onChange={(e) => setIncWindow(e.target.value)} options={INC_WINDOWS} />
        </FilterGroup>
      </aside>

      <div className="results">
        <div className="results__bar">
          <div className="results__count">
            <span className="results__num mono">{fmtNumber(activeRegions.length ? rows.length : data.total)}</span> companies
            {query ? <span className="results__q"> for “{query}”</span> : null}
          </div>
          <div className="results__sort">
            <Tabs variant="pill" value={view} onChange={setView} tabs={[{ id: "table", label: "Table" }, { id: "grid", label: "Grid" }]} />
            <span className="sort-label">Sort</span>
            <Select
              size="sm"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              options={[
                { value: "score", label: "Opportunity" },
                { value: "inc", label: "Newest" },
                { value: "name", label: "Name A–Z" },
              ]}
            />
            <IconButton icon="download" variant="solid" label="Export prospect list (CSV)" onClick={exportCsv} />
          </div>
        </div>

        <div className="chips-row">
          {chips.map((c) => (
            <Tag key={c} onRemove={() => setChips((cs) => cs.filter((x) => x !== c))}>
              {c}
            </Tag>
          ))}
          {!data.live ? (
            <Badge tone="warn">Sample data — add a Companies House key for the live register</Badge>
          ) : (
            <Badge tone="pos" dot>
              Live register
            </Badge>
          )}
          {chips.length ? (
            <button className="link-btn" onClick={() => router.push("/app/search")}>
              Clear
            </button>
          ) : null}
        </div>

        {data.keywords.length ? (
          <div className="signal-chips" style={{ marginBottom: 16 }}>
            <span className="sort-label">Keyword signals</span>
            {data.keywords.slice(0, 8).map((k) => (
              <span className="signal-chip" key={k.key}>
                {k.key} <span className="signal-chip__count">{k.count}</span>
              </span>
            ))}
          </div>
        ) : null}

        {view === "grid" ? (
          loading ? (
            <div className="app-loading">Searching the register…</div>
          ) : error ? (
            <div className="app-error">{error}</div>
          ) : rows.length === 0 ? (
            <Card variant="flat">
              <div className="empty-row" style={{ padding: 36, textAlign: "center" }}>
                No companies match these filters.
              </div>
            </Card>
          ) : (
            <ExplorerGrid rows={rows} />
          )
        ) : (
        <Card variant="flat">
          <CardBody flush>
            <table className="data-table data-table--full">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Signals</th>
                  <th>Region</th>
                  <th className="num">Age</th>
                  <th className="num">
                    Opportunity <span className="pro-tag">Pro</span>
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="empty-row">
                    <td colSpan={7}>Searching the register…</td>
                  </tr>
                ) : error ? (
                  <tr className="empty-row">
                    <td colSpan={7}>{error}</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan={7}>No companies match these filters.</td>
                  </tr>
                ) : (
                  rows.map((c) => (
                    <tr key={c.number} onClick={() => router.push(`/app/company/${c.number}`)}>
                      <td>
                        <div className="cell-co">
                          <CompanyAvatar name={c.name} size="md" />
                          <div>
                            <div className="cell-co__name">{c.name}</div>
                            <div className="cell-co__no">
                              {c.number}
                              {c.incorporated ? ` · inc. ${c.incorporated.slice(0, 4)}` : ""}
                              {c.classification ? ` · ${c.classification.code}` : ""}
                            </div>
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
                      <td className="num mono">{ageLabel(c.incorporated)}</td>
                      <td className="num">
                        <ScorePill score={c.score} />
                      </td>
                      <td className="num">
                        <Icon name="chevronRight" size={16} color="var(--text-faint)" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>
        )}

        {!loading && rows.length > 0 ? (
          <div className="load-more">
            <Button variant="secondary" onClick={exportCsv} iconLeft="download">
              Export {fmtNumber(rows.length)} as prospect list
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
