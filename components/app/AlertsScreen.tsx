"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardBody, Button, Input, Select, Badge, Icon, Tag } from "@/components/ds";
import { KEYWORDS } from "@/lib/keywords";
import { ALL_SECTORS } from "@/lib/sic";
import { ALL_REGIONS } from "@/lib/geography";
import { ruleSummary, type AlertRule, type AlertChannel } from "@/lib/alerts";

const LS_KEY = "ciq.alerts.demo";
const KEYWORD_KEYS = KEYWORDS.map((k) => k.key);

function uid(): string {
  return "a_" + Math.abs(Date.now() ^ (KEYWORD_KEYS.length * 2654435761)).toString(36) + Math.floor(performance.now()).toString(36);
}

export function AlertsScreen() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [authed, setAuthed] = useState(false);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [run, setRun] = useState<{ alert: string; matches: number; delivery: { detail: string } }[] | null>(null);
  const [running, setRunning] = useState(false);

  // form
  const [name, setName] = useState("New AI companies in London");
  const [kw, setKw] = useState<string[]>(["AI"]);
  const [sector, setSector] = useState("");
  const [region, setRegion] = useState("London");
  const [channel, setChannel] = useState<AlertChannel>("webhook");
  const [destination, setDestination] = useState("");

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => {
        setConfigured(!!d.configured);
        setAuthed(!!d.authed);
        if (d.configured && d.authed && Array.isArray(d.alerts)) {
          setAlerts(
            d.alerts.map((a: Record<string, unknown>) => ({
              id: a.id, name: a.name, keywords: a.keywords ?? [], sector: a.sector ?? undefined,
              region: a.region ?? undefined, status: a.status ?? [], channel: a.channel, destination: a.destination, active: a.active,
            })) as AlertRule[]
          );
        } else {
          try {
            const local = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
            setAlerts(local);
          } catch {
            setAlerts([]);
          }
        }
      })
      .catch(() => setConfigured(false));
  }, []);

  const persistLocal = (next: AlertRule[]) => {
    setAlerts(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  async function addAlert() {
    const rule: AlertRule = {
      id: uid(),
      name: name.trim() || "Untitled alert",
      keywords: kw,
      sector: sector || undefined,
      region: region || undefined,
      status: ["active"],
      channel,
      destination: destination.trim(),
      active: true,
      createdAt: new Date().toISOString(),
    };
    if (configured && authed) {
      const res = await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rule) });
      const d = await res.json();
      if (d.alert) setAlerts((a) => [{ ...rule, id: d.alert.id }, ...a]);
    } else {
      persistLocal([rule, ...alerts]);
    }
  }

  async function removeAlert(id: string) {
    if (configured && authed) {
      await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
      setAlerts((a) => a.filter((x) => x.id !== id));
    } else {
      persistLocal(alerts.filter((x) => x.id !== id));
    }
  }

  async function testRun() {
    setRunning(true);
    setRun(null);
    try {
      const res = await fetch("/api/alerts/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alerts }) });
      const d = await res.json();
      setRun(d.report ?? []);
    } finally {
      setRunning(false);
    }
  }

  function toggleKw(k: string) {
    setKw((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Standing intelligence</div>
          <h1 className="screen-title">Signals &amp; alerts</h1>
        </div>
        <Button variant="secondary" iconLeft="bell" onClick={testRun} disabled={running || !alerts.length}>
          {running ? "Evaluating…" : "Test run"}
        </Button>
      </div>

      {configured === false ? (
        <div className="chips-row" style={{ marginBottom: 16 }}>
          <Badge tone="warn">Demo mode — alerts saved in this browser. Configure Supabase to persist + schedule.</Badge>
        </div>
      ) : null}

      <div className="alerts-grid">
        <Card>
          <CardHeader subtitle="New rule" title="Create an alert" />
          <CardBody>
            <div className="alert-form">
              <Input label="Alert name" value={name} onChange={(e) => setName(e.target.value)} placeholder="New AI companies in London" />
              <div>
                <div className="ciq-field__label" style={{ marginBottom: 8 }}>
                  Keyword signals
                </div>
                <div className="kw-chips">
                  {KEYWORD_KEYS.map((k) => (
                    <Tag key={k} active={kw.includes(k)} onClick={() => toggleKw(k)}>
                      {k}
                    </Tag>
                  ))}
                </div>
              </div>
              <Select placeholder="Any sector" value={sector} onChange={(e) => setSector(e.target.value)} options={["", ...ALL_SECTORS].map((s) => ({ value: s, label: s || "Any sector" }))} />
              <Select value={region} onChange={(e) => setRegion(e.target.value)} options={["", ...ALL_REGIONS].map((s) => ({ value: s, label: s || "Any region" }))} />
              <Select value={channel} onChange={(e) => setChannel(e.target.value as AlertChannel)} options={[{ value: "webhook", label: "Webhook" }, { value: "slack", label: "Slack" }, { value: "email", label: "Email" }]} />
              <Input label="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={channel === "email" ? "you@company.co.uk" : "https://…"} />
              <Button variant="primary" iconLeft="plus" onClick={addAlert}>
                Create alert
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader subtitle="Active" title="Your alerts" action={<Badge tone="accent">{alerts.length}</Badge>} />
          <CardBody flush>
            {alerts.length === 0 ? (
              <div style={{ padding: 28 }} className="muted">
                No alerts yet. Create one to watch the register for new companies that match.
              </div>
            ) : (
              alerts.map((a) => {
                const hit = run?.find((r) => r.alert === a.name);
                return (
                  <div className="alert-row" key={a.id}>
                    <span className={"signal__icon signal__icon--info"}>
                      <Icon name="bell" size={15} />
                    </span>
                    <div className="alert-row__main">
                      <div className="alert-row__name">{a.name}</div>
                      <div className="alert-row__rule">{ruleSummary(a)}</div>
                      <div className="alert-row__delivery">
                        {a.channel.toUpperCase()} → {a.destination || "—"}
                      </div>
                    </div>
                    {hit ? <Badge tone={hit.matches ? "pos" : "neutral"}>{hit.matches} match{hit.matches === 1 ? "" : "es"}</Badge> : null}
                    <button className="link-btn" onClick={() => removeAlert(a.id)} aria-label="Delete">
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>
      </div>

      {run ? (
        <div className="report__disclaimer">
          Test run evaluated {alerts.length} rule(s) against companies incorporated in the last 7 days.
          {run.some((r) => r.matches > 0) ? " Matches delivered per each rule's channel." : " No matches in the window."}
        </div>
      ) : null}
    </div>
  );
}
