"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Icon } from "@/components/ds";
import { FreeAlertForm } from "@/components/FreeAlertForm";
import { ALERT_REGIONS, ALERT_SECTORS } from "@/lib/alert-options";
import { growthEvent } from "@/lib/growth/beacon";
import { SEARCH_INTENT_LABELS, type SearchIntent } from "@/lib/growth/intent";

// ============================================================
// Prospect-list header — a market search framed as the start of a list.
//
// "new construction companies in Birmingham" isn't a look-up; it's a market.
// So above the results we say what that market is on the live register (active
// companies, how many formed in the last 30 days) and offer the next steps that
// turn a search into a workflow: newest first, save it, get it weekly, export.
// Paid steps route free users to plans; the weekly email is free for anyone.
// Counts and their caveats come from /api/market-summary (lib/market-summary.ts).
// ============================================================

interface Summary {
  sector: string | null;
  location: string | null;
  sicCodes: number;
  active: number;
  new30: number;
}

const num = (n: number) => n.toLocaleString("en-GB");

export function MarketHeader({
  query,
  intent,
  sector,
  place,
  region,
  pro,
  signedIn,
  canSave,
  saving,
  sortedNewest,
  onNewest,
  onSave,
  onExport,
}: {
  query: string;
  intent: SearchIntent;
  sector: string | null;
  place: string | null;
  region: string | null;
  pro: boolean;
  signedIn: boolean;
  canSave: boolean;
  saving: boolean;
  sortedNewest: boolean;
  onNewest: () => void;
  onSave: () => void;
  onExport: () => void;
}) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  useEffect(() => {
    let live = true;
    setLoaded(false);
    setSummary(null);
    setAlertOpen(false);
    const sp = new URLSearchParams();
    if (sector) sp.set("sector", sector);
    if (place) sp.set("place", place);
    if (region) sp.set("region", region);
    fetch(`/api/market-summary?${sp.toString()}`)
      .then((r) => r.json())
      .then((d: { summary: Summary | null }) => {
        if (!live) return;
        setSummary(d.summary);
        if (d.summary) {
          growthEvent("market_view", {
            meta: { intent, sector, place: place ?? region, active: d.summary.active, new30: d.summary.new30 },
          });
        }
      })
      .catch(() => {})
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
    // One summary per market, not per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const where = place ?? region;
  const title = `${sector ?? "Companies"}${where ? ` · ${where}` : ""}`;
  const upgradeHref = signedIn ? "/app/upgrade" : "/pricing";
  // The free weekly email covers sector + region; only offer scopes it supports.
  const alertSector = ALERT_SECTORS.some((o) => o.value === sector) ? sector ?? "" : "";
  const alertRegion = ALERT_REGIONS.some((o) => o.value === region) ? region ?? "" : "";
  const gated = (ref: string) => () => growthEvent("gated_action", { ref, meta: { intent } });

  return (
    <section className="mkt" aria-label="Prospect list">
      <div className="mkt__eyebrow mono">Prospect list · {SEARCH_INTENT_LABELS[intent]}</div>
      <h2 className="mkt__title">{title}</h2>

      {summary ? (
        <>
          <p className="mkt__stats">
            <strong>{num(summary.active)}</strong> active {summary.active === 1 ? "company" : "companies"}
            <span className="mkt__sep">·</span>
            <strong>{num(summary.new30)}</strong> formed in the last 30 days
          </p>
          <p className="mkt__note">
            {summary.location ? `Registered office in ${summary.location}` : "Across the UK"}
            {summary.sicCodes ? ` · across ${summary.sicCodes} tracked ${sector} SIC codes` : ""} · live from Companies House
          </p>
        </>
      ) : loaded ? null : (
        <p className="mkt__stats muted">Counting this market on the register…</p>
      )}

      <div className="mkt__actions">
        {!sortedNewest ? (
          <Button variant="secondary" size="sm" iconLeft="clock" onClick={onNewest}>
            Newest first
          </Button>
        ) : null}
        {canSave ? (
          <Button variant="secondary" size="sm" iconLeft="bookmark" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save this market"}
          </Button>
        ) : (
          <Button href={upgradeHref} variant="secondary" size="sm" iconLeft="bookmark" onClick={gated("save_market")}>
            Save this market
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          iconLeft="bell"
          onClick={() => {
            if (!alertOpen) growthEvent("market_alert", { meta: { intent, sector: alertSector, region: alertRegion } });
            setAlertOpen((v) => !v);
          }}
          aria-expanded={alertOpen}
        >
          Get new ones weekly
        </Button>
        {pro ? (
          <Button variant="secondary" size="sm" iconLeft="download" onClick={onExport}>
            Export these results
          </Button>
        ) : (
          <Button href={upgradeHref} variant="secondary" size="sm" iconLeft="download" onClick={gated("export_market")}>
            Export list
          </Button>
        )}
      </div>

      {alertOpen ? (
        <div className="mkt__alert">
          <p className="mkt__note">
            <Icon name="bell" size={13} /> A free weekly email of newly registered {alertSector || "UK"} companies
            {alertRegion ? ` in ${alertRegion}` : ""}. No account needed.
          </p>
          <FreeAlertForm compact sector={alertSector} region={alertRegion} source="search-market" />
        </div>
      ) : null}

      {!pro ? (
        <p className="mkt__note">
          <Link href={upgradeHref}>Analyst</Link> unlocks the full list, saved markets and CSV export.
        </p>
      ) : null}
    </section>
  );
}
