"use client";
import { useState } from "react";
import { Card, CardHeader, CardBody, Stat, Badge, Button } from "@/components/ds";
import { fmtNumber } from "@/lib/format";

export interface CampaignStats {
  totalLeads: number;
  byEvent: Record<string, number>;
  bySource: Record<string, { scan: number; view: number; lead: number; purchase: number }>;
}

export function CampaignsScreen({ stats }: { stats: CampaignStats | null }) {
  const [numbers, setNumbers] = useState("");
  const [source, setSource] = useState("digitwarehouse");
  const [items, setItems] = useState<string[]>([]);

  function generate() {
    const list = numbers
      .split(/[\s,]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    setItems(Array.from(new Set(list)));
  }

  const sources = stats ? Object.entries(stats.bySource).sort((a, b) => b[1].view + b[1].scan - (a[1].view + a[1].scan)) : [];

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Funnel · DigitWarehouse</div>
          <h1 className="screen-title">Campaigns</h1>
        </div>
        <Badge tone="neutral" dot>
          Aggregates only
        </Badge>
      </div>

      {/* Funnel KPIs */}
      <div className="kpi-grid">
        <Card>
          <CardBody>
            <Stat label="QR scans" value={stats ? fmtNumber(stats.byEvent.scan ?? 0) : "—"} sub="letter opens" />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat label="Report views" value={stats ? fmtNumber(stats.byEvent.view ?? 0) : "—"} sub="incl. direct" />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat label="Leads captured" value={stats ? fmtNumber(stats.totalLeads) : "—"} sub="form submits" />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat label="Purchases" value={stats ? fmtNumber(stats.byEvent.purchase ?? 0) : "—"} sub="completed checkouts" />
          </CardBody>
        </Card>
      </div>

      <div className="dash-cols" style={{ marginTop: 18 }}>
        {/* By source */}
        <Card>
          <CardHeader subtitle="Performance" title="By campaign source" />
          <CardBody flush>
            <table className="data-table data-table--full">
              <thead>
                <tr>
                  <th>Source</th>
                  <th className="num">Scans</th>
                  <th className="num">Views</th>
                  <th className="num">Leads</th>
                  <th className="num">Sales</th>
                </tr>
              </thead>
              <tbody>
                {sources.length ? (
                  sources.map(([src, s]) => (
                    <tr key={src}>
                      <td>{src}</td>
                      <td className="num mono">{s.scan}</td>
                      <td className="num mono">{s.view}</td>
                      <td className="num mono">{s.lead}</td>
                      <td className="num mono">{s.purchase}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="empty-row">
                    <td colSpan={5}>{stats ? "No campaign activity yet." : "Supabase not configured."}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>

        {/* QR generator */}
        <Card>
          <CardHeader subtitle="For printed letters" title="QR code generator" />
          <CardBody>
            <p className="report__disclaimer" style={{ padding: "0 0 12px" }}>
              Each QR points to <span className="mono">/company/&lt;number&gt;/growth-report?source=&lt;source&gt;</span>.
            </p>
            <div className="filter-group" style={{ marginBottom: 12 }}>
              <div className="filter-group__head">Company numbers (one per line or comma-separated)</div>
              <textarea
                className="qr-input"
                rows={3}
                placeholder="00502851, 13633487"
                value={numbers}
                onChange={(e) => setNumbers(e.target.value)}
              />
            </div>
            <div className="filter-group" style={{ marginBottom: 12 }}>
              <div className="filter-group__head">Campaign source</div>
              <input className="qr-input" value={source} onChange={(e) => setSource(e.target.value)} />
            </div>
            <Button variant="primary" onClick={generate}>
              Generate QR codes
            </Button>

            {items.length ? (
              <div className="qr-grid">
                {items.map((n) => {
                  const svg = `/api/qr?number=${encodeURIComponent(n)}&source=${encodeURIComponent(source)}`;
                  const png = `${svg}&format=png&download=1`;
                  return (
                    <div className="qr-card" key={n}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={svg} alt={`QR for ${n}`} width={130} height={130} />
                      <div className="qr-card__no mono">{n}</div>
                      <a className="link-btn" href={png}>
                        Download PNG
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
