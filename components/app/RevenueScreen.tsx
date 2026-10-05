"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody, Stat, Badge, Button, type BadgeTone } from "@/components/ds";
import { fmtNumber } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { RevenueDashboard } from "@/lib/growth/dashboard";
import type { AutopilotMode } from "@/lib/growth/engine";
import type { Opportunity } from "@/lib/growth/search-console";

const gbp = (n: number) => `£${n.toLocaleString("en-GB", { maximumFractionDigits: n % 1 ? 2 : 0 })}`;
const pct = (n: number, dp = 1) => `${(n * 100).toFixed(dp)}%`;
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const MODES: { id: AutopilotMode; label: string; hint: string }[] = [
  { id: "off", label: "Off", hint: "Nothing runs." },
  { id: "dry_run", label: "Dry run", hint: "Logs what it would send — no customer emails. You still get the hot-lead digest." },
  { id: "live", label: "Live", hint: "Sends lifecycle emails via Resend, one per account at most every 48h." },
];

const TIER_TONE: Record<string, BadgeTone> = { hot: "neg", warm: "warn", cold: "neutral" };
const STATUS_TONE: Record<string, BadgeTone> = { sent: "pos", dry_run: "info", failed: "neg", queued: "warn", none: "neutral" };
const INTENT_TONE: Record<string, BadgeTone> = { commercial: "accent", competitor: "warn", sector: "info", brand: "pos", informational: "neutral", lookup: "neutral", other: "neutral" };

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/growth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const d = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(String(d.error ?? "Request failed"));
  return d;
}

function Empty({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <tr className="empty-row">
      <td colSpan={cols}>{children}</td>
    </tr>
  );
}

function OppTable({ rows, query }: { rows: Opportunity[]; query: boolean }) {
  return (
    <div className="table-scroll">
      <table className="data-table data-table--full rev-table">
        <thead>
          <tr>
            <th>{query ? "Query" : "Page"}</th>
            <th className="num">Impr.</th>
            <th className="num">CTR</th>
            <th className="num">Pos.</th>
            <th className="num">+Clicks</th>
            <th>Do this</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((o) => (
              <tr key={o.kind + o.key}>
                <td className="rev-key">
                  {query ? o.key : <a href={o.key} target="_blank" rel="noreferrer">{o.key.replace(/^https?:\/\/[^/]+/, "") || "/"}</a>}
                  <div className="rev-tags">
                    <Badge tone={o.kind === "ctr_gap" ? "warn" : "info"}>{o.kind === "ctr_gap" ? "CTR gap" : "Page 2"}</Badge>
                    {o.intent ? <Badge tone={INTENT_TONE[o.intent]}>{o.intent}</Badge> : null}
                  </div>
                </td>
                <td className="num mono">{fmtNumber(o.impressions)}</td>
                <td className="num mono">{pct(o.ctr)}</td>
                <td className="num mono">{o.position.toFixed(1)}</td>
                <td className="num mono">+{fmtNumber(o.missedClicks)}</td>
                <td className="rev-action">{o.action}</td>
              </tr>
            ))
          ) : (
            <Empty cols={6}>No opportunities yet — import a Search Console export below.</Empty>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function RevenueScreen({ data }: { data: RevenueDashboard }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const { money, funnel, search } = data;
  const top = Math.max(1, ...funnel.map((f) => f.count));

  async function act(key: string, body: Record<string, unknown>, ok: (d: Record<string, unknown>) => string) {
    setBusy(key);
    try {
      const d = await post(body);
      toast(ok(d), { tone: "success" });
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", { tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy("import");
    try {
      for (const f of Array.from(files)) {
        const d = await post({ action: "import_gsc", csv: await f.text() });
        toast(`Imported ${fmtNumber(Number(d.rows))} ${String(d.kind)} from ${f.name}`, { tone: "success" });
      }
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Import failed", { tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  const run = data.lastRun;

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Admin · Conversion</div>
          <h1 className="screen-title">Revenue</h1>
        </div>
        <div className="rev-window" role="group" aria-label="Time window">
          {[7, 30, 90].map((d) => (
            <Link key={d} href={`/app/revenue?days=${d}`} className={"rev-pill" + (data.windowDays === d ? " rev-pill--on" : "")}>
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {data.setupError ? <div className="editor-alert editor-alert--error">{data.setupError}</div> : null}

      <div className="kpi-grid">
        <Card>
          <CardBody>
            <Stat label="MRR" value={gbp(money.mrr)} sub={money.source === "stripe" ? "live from Stripe" : "estimated from list prices"} />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat label="Paying customers" value={fmtNumber(money.customers)} sub="active subscriptions" />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat label={`Collected · ${data.windowDays}d`} value={gbp(money.collected)} sub="completed checkouts (first-party)" />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat label={`Autopilot-assisted · ${data.windowDays}d`} value={gbp(money.recovered)} sub="paid ≤7 days after an email" />
          </CardBody>
        </Card>
      </div>

      <div className="dash-cols">
        <Card>
          <CardHeader subtitle={`Signed-in accounts only — no bots · last ${data.windowDays} days`} title="Funnel" titleAs="h2" />
          <CardBody>
            <ol className="rev-funnel">
              {funnel.map((f, i) => {
                const prev = i ? funnel[i - 1].count : 0;
                return (
                  <li key={f.label} className="rev-funnel__step">
                    <div className="rev-funnel__head">
                      <span className="rev-funnel__label">{f.label}</span>
                      <span className="mono">
                        {fmtNumber(f.count)}
                        {i && prev ? <span className="muted"> · {pct(f.count / prev, 0)} of prev</span> : null}
                      </span>
                    </div>
                    <div className="rev-bar">
                      <span style={{ width: `${Math.max(2, (f.count / top) * 100)}%` }} />
                    </div>
                    <div className="rev-funnel__hint muted">{f.hint}</div>
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            subtitle="Lifecycle emails + daily hot-lead digest"
            title="Autopilot"
            titleAs="h2"
            action={
              <Button
                variant="secondary"
                size="sm"
                disabled={!!busy || data.mode === "off"}
                onClick={() =>
                  act("run", { action: "run" }, (d) => {
                    const r = d.result as { sent: number; dryRun: number; hotLeads: number };
                    return `Ran: ${r.sent} sent · ${r.dryRun} dry-run · ${r.hotLeads} hot leads`;
                  })
                }
              >
                {busy === "run" ? "Running…" : "Run now"}
              </Button>
            }
          />
          <CardBody>
            <div className="rev-modes" role="radiogroup" aria-label="Autopilot mode">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={data.mode === m.id}
                  className={"rev-mode" + (data.mode === m.id ? " rev-mode--on" : "") + (m.id === "live" ? " rev-mode--live" : "")}
                  disabled={!!busy}
                  onClick={() => {
                    if (m.id === data.mode) return;
                    if (m.id === "live" && !confirm("Go live? CompaniesIQ will start emailing users automatically (max one email per user per 48h).")) return;
                    act("mode", { action: "set_mode", mode: m.id }, () => `Autopilot: ${m.label}`);
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="muted rev-note">{MODES.find((m) => m.id === data.mode)?.hint}</p>

            <div className="rev-lastrun">
              <div className="mono rev-lastrun__h">Last run · {when(data.lastRunAt)}</div>
              {run ? (
                <div className="muted">
                  {run.trigger?.startsWith("manual") ? "Manual" : "Cron"} · {run.accounts} accounts · {run.sent} sent · {run.dryRun} dry-run
                  {run.failed ? ` · ${run.failed} failed` : ""} · {run.hotLeads} hot{run.digestSent ? " · digest emailed" : ""}
                </div>
              ) : (
                <div className="muted">Never run. The cron runs daily at 09:00 UTC.</div>
              )}
            </div>

            <table className="data-table rev-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th className="num">Sent</th>
                  <th className="num">Paid ≤7d</th>
                </tr>
              </thead>
              <tbody>
                {data.templates.map((t) => (
                  <tr key={t.template}>
                    <td>{t.label}</td>
                    <td className="num mono">{t.sent}</td>
                    <td className="num mono">
                      {t.converted}
                      {t.sent ? <span className="muted"> ({pct(t.converted / t.sent, 0)})</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>

      <Card style={{ marginTop: 18 }}>
        <CardHeader subtitle="Started Stripe checkout, never completed" title={`Abandoned checkouts · ${data.abandoned.length}`} titleAs="h2" />
        <CardBody flush>
          <div className="table-scroll">
            <table className="data-table data-table--full rev-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Plan</th>
                  <th>Started</th>
                  <th>Recovery email</th>
                </tr>
              </thead>
              <tbody>
                {data.abandoned.length ? (
                  data.abandoned.map((a) => (
                    <tr key={a.email + a.startedAt}>
                      <td>
                        <a href={`mailto:${a.email}`}>{a.email}</a>
                      </td>
                      <td>
                        {a.plan} · {a.billing}
                      </td>
                      <td className="mono">{when(a.startedAt)}</td>
                      <td>
                        <Badge tone={STATUS_TONE[a.recovery]}>{a.recovery === "queued" ? "next run" : a.recovery}</Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <Empty cols={4}>No abandoned checkouts in this window.</Empty>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card style={{ marginTop: 18 }}>
        <CardHeader subtitle="Free accounts ranked by buying intent — the top ones deserve a personal note" title="Leads" titleAs="h2" />
        <CardBody flush>
          <div className="table-scroll">
            <table className="data-table data-table--full rev-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th className="num">Intent</th>
                  <th>Stage</th>
                  <th>Signals</th>
                  <th>Next automated step</th>
                </tr>
              </thead>
              <tbody>
                {data.leads.length ? (
                  data.leads.map((l) => (
                    <tr key={l.email}>
                      <td>
                        <a href={`mailto:${l.email}`}>{l.email}</a>
                        <div className="muted rev-sub">joined {when(l.signedUp)}</div>
                      </td>
                      <td className="num">
                        <Badge tone={TIER_TONE[l.tier]}>{l.score}</Badge>
                      </td>
                      <td>{l.stage}</td>
                      <td className="rev-action">{l.signals.join(" · ") || "—"}</td>
                      <td className="rev-action">{l.next ?? <span className="muted">—</span>}</td>
                    </tr>
                  ))
                ) : (
                  <Empty cols={5}>No scored leads yet — signals arrive as signed-in users hit paywalls, pricing and checkout.</Empty>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card style={{ marginTop: 18 }}>
        <CardHeader subtitle="Most recent first" title="Email log" titleAs="h2" />
        <CardBody flush>
          <div className="table-scroll">
            <table className="data-table data-table--full rev-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>When</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {data.emails.length ? (
                  data.emails.map((m, i) => (
                    <tr key={i}>
                      <td>{m.email}</td>
                      <td>{m.template}</td>
                      <td>
                        <Badge tone={STATUS_TONE[m.status] ?? "neutral"}>{m.status.replace("_", " ")}</Badge>
                      </td>
                      <td className="mono">{when(m.at)}</td>
                      <td>{m.converted ? <Badge tone="pos">Paid</Badge> : <span className="muted">—</span>}</td>
                    </tr>
                  ))
                ) : (
                  <Empty cols={5}>Nothing yet. Press “Run now” to see what the autopilot would send.</Empty>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <div className="rev-section-head">
        <div>
          <div className="app-eyebrow">Demand</div>
          <h2 className="rev-h2">Search Console</h2>
          <p className="muted rev-note">
            GSC → Performance → Export → CSV, then upload the <strong>Pages</strong> and <strong>Queries</strong> files.
            Last import: pages {when(search.importedAt.pages)} · queries {when(search.importedAt.queries)}
          </p>
        </div>
        <label className={"rev-upload" + (busy === "import" ? " is-busy" : "")}>
          <input type="file" accept=".csv,text/csv" multiple disabled={!!busy} onChange={(e) => importFiles(e.target.files)} />
          {busy === "import" ? "Importing…" : "Import CSV exports"}
        </label>
      </div>

      {search.totals ? (
        <div className="kpi-grid">
          <Card>
            <CardBody>
              <Stat label="Clicks" value={fmtNumber(search.totals.clicks)} sub="top 1,000 pages" />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat label="Impressions" value={fmtNumber(search.totals.impressions)} />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat label="CTR" value={pct(search.totals.ctr, 2)} />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat
                label="Clicks on the table"
                value={`+${fmtNumber(search.pageOpportunities.reduce((s, o) => s + o.missedClicks, 0))}`}
                sub="from the opportunities below"
              />
            </CardBody>
          </Card>
        </div>
      ) : null}

      <div className="dash-cols">
        <Card>
          <CardHeader subtitle="Which templates earn the traffic" title="By page type" titleAs="h3" />
          <CardBody flush>
            <div className="table-scroll">
              <table className="data-table data-table--full rev-table">
                <thead>
                  <tr>
                    <th>Template</th>
                    <th className="num">Pages</th>
                    <th className="num">Clicks</th>
                    <th className="num">Impr.</th>
                    <th className="num">CTR</th>
                    <th className="num">Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {search.pageTemplates.length ? (
                    search.pageTemplates.map((b) => (
                      <tr key={b.label}>
                        <td className="mono">{b.label}</td>
                        <td className="num mono">{b.count}</td>
                        <td className="num mono">{fmtNumber(b.clicks)}</td>
                        <td className="num mono">{fmtNumber(b.impressions)}</td>
                        <td className="num mono">{pct(b.ctr, 2)}</td>
                        <td className="num mono">{b.position.toFixed(1)}</td>
                      </tr>
                    ))
                  ) : (
                    <Empty cols={6}>Import the Pages export.</Empty>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader subtitle="Buyers vs look-ups vs how-to" title="Query intent" titleAs="h3" />
          <CardBody flush>
            <div className="table-scroll">
              <table className="data-table data-table--full rev-table">
                <thead>
                  <tr>
                    <th>Intent</th>
                    <th className="num">Queries</th>
                    <th className="num">Clicks</th>
                    <th className="num">Impr.</th>
                    <th className="num">Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {search.intents.length ? (
                    search.intents.map((b) => (
                      <tr key={b.label}>
                        <td>
                          <Badge tone={INTENT_TONE[b.label]}>{b.label}</Badge>
                        </td>
                        <td className="num mono">{b.count}</td>
                        <td className="num mono">{fmtNumber(b.clicks)}</td>
                        <td className="num mono">{fmtNumber(b.impressions)}</td>
                        <td className="num mono">{b.position.toFixed(1)}</td>
                      </tr>
                    ))
                  ) : (
                    <Empty cols={5}>Import the Queries export.</Empty>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card style={{ marginTop: 18 }}>
        <CardHeader subtitle="Visible but not clicked, or one push from page one — ranked by clicks we're missing" title="Page opportunities" titleAs="h3" />
        <CardBody flush>
          <OppTable rows={search.pageOpportunities} query={false} />
        </CardBody>
      </Card>
      <Card style={{ marginTop: 18 }}>
        <CardHeader subtitle="Commercial & competitor queries weighted ×2; third-party look-ups excluded" title="Query opportunities" titleAs="h3" />
        <CardBody flush>
          <OppTable rows={search.queryOpportunities} query />
        </CardBody>
      </Card>
    </div>
  );
}
