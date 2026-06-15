"use client";
import { useState } from "react";
import { Card, CardBody, Button, Badge, Icon } from "@/components/ds";
import { BulkAddToProspect } from "@/components/app/BulkAddToProspect";
import { toCSV, downloadCSV } from "@/lib/csv";
import { toast } from "@/lib/toast";
import { fmtDate } from "@/lib/format";

const MAX = 50;

interface Row {
  number: string;
  found: boolean;
  name: string | null;
  status: string | null;
  type: string | null;
  incorporated: string | null;
  sector: string | null;
  region: string | null;
  accountsNextDue: string | null;
  accountsOverdue: boolean | null;
  confirmationNextDue: string | null;
  confirmationOverdue: boolean | null;
  ownerNationalities: string[];
  score: number | null;
}

// Pull UK company numbers out of pasted text or CSV content.
function extractNumbers(text: string): string[] {
  const m = text.toUpperCase().match(/\b([A-Z]{2}\d{6}|\d{8}|[A-Z]{2}\d{5}[A-Z0-9])\b/g) ?? [];
  return Array.from(new Set(m));
}

export function EnrichScreen() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numbers = extractNumbers(text);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText((prev) => (prev ? prev + "\n" : "") + String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function run() {
    if (!numbers.length) {
      setError("No company numbers found — paste numbers or upload a CSV.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/enrich", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ numbers: numbers.slice(0, MAX) }),
      });
      const d = (await r.json().catch(() => ({}))) as { rows?: Row[]; error?: string; capped?: boolean };
      if (!r.ok || !d.rows) {
        setError(d.error || "Enrichment failed.");
        toast(d.error || "Enrichment failed.", { tone: "error" });
        return;
      }
      setRows(d.rows);
      const found = d.rows.filter((x) => x.found).length;
      toast(`Enriched ${found} of ${d.rows.length} compan${d.rows.length === 1 ? "y" : "ies"}`);
    } catch {
      setError("Enrichment failed — try again.");
      toast("Enrichment failed — try again.", { tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const csv = toCSV(
      ["Company", "Number", "Status", "Incorporated", "Sector", "Region", "Accounts due", "Accounts overdue", "Confirmation due", "Confirmation overdue", "Owner nationalities", "Opportunity score"],
      rows.map((r) => [
        r.name ?? "(not found)",
        r.number,
        r.status ?? "",
        r.incorporated ?? "",
        r.sector ?? "",
        r.region ?? "",
        r.accountsNextDue ?? "",
        r.accountsOverdue == null ? "" : r.accountsOverdue ? "yes" : "no",
        r.confirmationNextDue ?? "",
        r.confirmationOverdue == null ? "" : r.confirmationOverdue ? "yes" : "no",
        r.ownerNationalities.join("; "),
        r.score ?? "",
      ])
    );
    downloadCSV(`companiesiq-enriched-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast(`Exported ${rows.length} rows to CSV`, { tone: "info" });
  }

  const prospects = rows.filter((r) => r.found).map((r) => ({ number: r.number, name: r.name, sector: r.sector, region: r.region, score: r.score }));

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Bulk intelligence</div>
          <h1 className="screen-title">Enrich a list</h1>
        </div>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <CardBody>
          <p className="rsec__note">
            Paste up to {MAX} company numbers (one per line) or upload a CSV — we&apos;ll return each company&apos;s status,
            filing signals, owner nationality and an opportunity score.
          </p>
          <textarea
            className="enrich-input"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"12345678\nOC305893\nSC123456\n…  (or upload a CSV below)"}
          />
          <div className="enrich-actions">
            <label className="ciq-btn ciq-btn--secondary ciq-btn--sm" style={{ cursor: "pointer" }}>
              <Icon name="file" size={15} /> <span>Upload CSV</span>
              <input type="file" accept=".csv,.txt" onChange={onFile} style={{ display: "none" }} />
            </label>
            <span className="enrich-count">
              {numbers.length} compan{numbers.length === 1 ? "y" : "ies"} detected{numbers.length > MAX ? ` · first ${MAX} will run` : ""}
            </span>
            <div style={{ marginLeft: "auto" }}>
              <Button variant="primary" onClick={run} disabled={loading || !numbers.length} iconRight="arrowRight">
                {loading ? "Enriching…" : `Enrich ${Math.min(numbers.length, MAX) || ""}`.trim()}
              </Button>
            </div>
          </div>
          {error ? <div className="enrich-error">{error}</div> : null}
        </CardBody>
      </Card>

      {rows.length ? (
        <>
          <div className="enrich-toolbar">
            <span className="results__count">
              <span className="results__num mono">{rows.filter((r) => r.found).length}</span> enriched ·{" "}
              {rows.filter((r) => !r.found).length} not found
            </span>
            <div className="enrich-toolbar__actions">
              <BulkAddToProspect companies={prospects} />
              <Button variant="secondary" onClick={exportCsv} iconLeft="download">
                Download CSV
              </Button>
            </div>
          </div>
          <Card variant="flat">
            <CardBody flush>
              <div className="table-scroll">
                <table className="data-table data-table--full">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Sector</th>
                      <th>Region</th>
                      <th>Filing</th>
                      <th>Owners</th>
                      <th className="num">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.number}>
                        <td>
                          {r.found ? (
                            <a href={`/company/${r.number}`} className="cell-co" style={{ textDecoration: "none" }}>
                              <div>
                                <div className="cell-co__name">{r.name}</div>
                                <div className="cell-co__no mono">{r.number}</div>
                              </div>
                            </a>
                          ) : (
                            <div>
                              <div className="cell-co__name muted">Not found</div>
                              <div className="cell-co__no mono">{r.number}</div>
                            </div>
                          )}
                        </td>
                        <td className="muted">{r.status ?? "—"}</td>
                        <td className="muted">{r.sector ?? "—"}</td>
                        <td className="muted">{r.region ?? "—"}</td>
                        <td>
                          <div className="cell-tags">
                            {r.accountsOverdue ? <Badge tone="warn">Accounts overdue</Badge> : null}
                            {!r.accountsOverdue && r.accountsNextDue ? <Badge tone="neutral">Acc due {fmtDate(r.accountsNextDue)}</Badge> : null}
                            {r.confirmationOverdue ? <Badge tone="warn">Conf overdue</Badge> : null}
                            {!r.found ? <span className="muted">—</span> : null}
                          </div>
                        </td>
                        <td className="muted">{r.ownerNationalities.length ? r.ownerNationalities.join(", ") : "—"}</td>
                        <td className="num">{r.score != null ? <Badge tone="accent">{r.score}</Badge> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      ) : null}
    </div>
  );
}
