"use client";
// The Records tab: what is formally on the public register.
//
//   Timeline          filing history as events, filterable, with one
//                     deterministic plain-English line about strike-offs
//   Company details   the register record, with copy buttons
//   People & control  directors, PSCs and charges
//   Connections       companies sharing a director (unlocked only)
//
// Every row is in the server HTML. The filter chips only toggle `hidden` on
// rows that are already rendered, so the full history is crawlable and a
// no-JS reader sees all of it.
import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardBody, Badge, CompanyAvatar, Icon, IconButton, StatusPill } from "@/components/ds";
import type { Company, Officer, Filing, Charge, PSC } from "@/lib/types";
import type { DirectorNetwork } from "@/lib/network";
import { toTimeline, statusSummary, type ChangeKind } from "@/lib/changes";
import { fmtDate } from "@/lib/format";

type Filter = "all" | ChangeKind;

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`copybtn mono${done ? " is-done" : ""}`}
      aria-label={`Copy ${label}`}
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => {});
        setDone(true);
        window.setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function OfficerRow({ p, unlocked }: { p: Officer; unlocked: boolean }) {
  const inner = (
    <>
      <CompanyAvatar name={p.name} size="sm" tone={p.kind === "company" ? 0 : 2} />
      <div className="officer__meta">
        <div className="officer__name">{p.name}</div>
        <div className="officer__role">{p.role}</div>
      </div>
      <div className="officer__date mono">{fmtDate(p.appointed)}</div>
      <StatusPill status={p.status === "resigned" ? "dissolved" : "active"} />
      {p.officerId && unlocked ? <Icon name="chevronRight" size={15} className="officer__chev" /> : null}
    </>
  );
  // Director profiles are part of the gated intelligence — only link them when
  // unlocked, so indexable public reports don't point Googlebot at a login wall.
  if (p.officerId && unlocked) {
    return (
      <Link className="officer is-link" href={`/app/director/${p.officerId}`} style={{ textDecoration: "none" }}>
        {inner}
      </Link>
    );
  }
  return <div className="officer">{inner}</div>;
}

export function RecordsPanel({
  company: c,
  officers,
  filings,
  shownFilings,
  charges,
  pscs,
  network,
  unlocked,
  signedIn,
  hasFiledAccounts,
  onExportFilings,
}: {
  company: Company;
  officers: Officer[];
  filings: Filing[];
  /** The filings this reader's plan may display. */
  shownFilings: Filing[];
  charges: Charge[];
  pscs: PSC[];
  network: DirectorNetwork | null;
  unlocked: boolean;
  signedIn: boolean;
  hasFiledAccounts: boolean;
  onExportFilings: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const events = useMemo(() => toTimeline(shownFilings, null), [shownFilings]);
  // The summary reads the FULL history: a strike-off outside the free window
  // still happened, and the sentence must not change with the reader's plan.
  const summary = useMemo(
    () => statusSummary(toTimeline(filings, null), { accountsFiled: hasFiledAccounts }),
    [filings, hasFiledAccounts]
  );
  const counts = {
    all: events.length,
    filing: events.filter((e) => e.kind === "filing").length,
    status: events.filter((e) => e.kind === "status").length,
  };
  const truncated = shownFilings.length < filings.length;

  const address = c.address
    ? [c.address.line1, c.address.line2, c.address.locality, c.address.postcode].filter(Boolean).join(", ")
    : "";
  const fmtDue = (d?: { nextDue?: string; overdue?: boolean }) =>
    d?.nextDue ? `${d.overdue ? "Overdue, was due" : "Next due"} ${fmtDate(d.nextDue)}` : "—";
  const details: { k: string; v: React.ReactNode; copy?: string; risk?: boolean }[] = [
    { k: "Company", v: c.name, copy: c.name },
    { k: "Number", v: <span className="mono">{c.number}</span>, copy: c.number },
    { k: "Registered office", v: address || "—", copy: address || undefined },
    { k: "Incorporated", v: <span className="mono">{fmtDate(c.incorporated)}</span> },
    { k: "Type", v: c.type || "—" },
    {
      k: "Nature of business",
      v: c.sicCodes.length ? c.classifications.map((cl) => `${cl.code} — ${cl.category}`).join("; ") : "—",
    },
    { k: "Status", v: <StatusPill status={c.status} /> },
    { k: "Region", v: [c.geo?.region, c.geo?.nation].filter((x) => x && x !== "Unknown").join(" · ") || "—" },
    { k: "Accounts", v: fmtDue(c.accounts), risk: !!c.accounts?.overdue },
    { k: "Confirmation statement", v: fmtDue(c.confirmationStatement), risk: !!c.confirmationStatement?.overdue },
  ];

  return (
    <>
      <Card>
        <CardHeader
          subtitle="Companies House · filing history"
          title="Timeline"
          action={
            filings.length ? (
              <IconButton icon="download" variant="solid" label="Export filings" onClick={onExportFilings} />
            ) : (
              <Badge tone="neutral">No events</Badge>
            )
          }
        />
        <CardBody>
          {events.length ? (
            <div className="tl-filters" role="group" aria-label="Filter the timeline">
              {(
                [
                  ["all", "All"],
                  ["filing", "Filings"],
                  ["status", "Status changes"],
                ] as [Filter, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={`tl-filters__btn${filter === k ? " is-on" : ""}`}
                  aria-pressed={filter === k}
                  onClick={() => setFilter(k)}
                >
                  {label} <span className="tl-filters__n mono">{counts[k]}</span>
                </button>
              ))}
            </div>
          ) : null}
          {summary ? (
            <p className="tl-summary">
              <strong>In plain English:</strong> {summary}
            </p>
          ) : null}
          <ol className="timeline">
            {events.map((ev, i) => (
              <li className={`tl-row tl-row--${ev.tone}`} key={i} hidden={filter !== "all" && ev.kind !== filter}>
                <span className="tl-row__icon" aria-hidden="true">
                  <Icon name={ev.icon} size={15} />
                </span>
                <span className="tl-row__body">
                  <span className="tl-row__label">{ev.label}</span>
                  {ev.detail ? <span className="tl-row__detail">{ev.detail}</span> : null}
                </span>
                <span className="tl-row__date mono">{fmtDate(ev.date)}</span>
              </li>
            ))}
          </ol>
          {events.length === 0 ? <p className="icard__note">No filing history available.</p> : null}
          {truncated ? (
            <p className="icard__note">
              Showing the {shownFilings.length} most recent of {filings.length} filings.{" "}
              <Link href="/app/upgrade">Upgrade for the complete history</Link>.
            </p>
          ) : null}
        </CardBody>
      </Card>

      <div className="intel__row2">
        <Card>
          <CardHeader subtitle="Register record" title="Company details" />
          <CardBody>
            <dl className="copylist">
              {details.map((d) => (
                <div className="copylist__row" key={d.k}>
                  <dt className="copylist__k mono">{d.k}</dt>
                  <dd className={`copylist__v${d.risk ? " detail-overdue" : ""}`}>{d.v}</dd>
                  <dd className="copylist__act">{d.copy ? <CopyButton value={d.copy} label={d.k.toLowerCase()} /> : null}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            subtitle="Shared directors"
            title="Connected companies"
            action={
              network ? (
                <Badge tone="neutral">
                  {network.directorsChecked} director{network.directorsChecked === 1 ? "" : "s"} checked
                </Badge>
              ) : null
            }
          />
          <CardBody>
            {network && network.connections.length ? (
              <>
                <p className="icard__note" style={{ marginTop: 0 }}>
                  Other active companies that share a director with {c.name} — from the officer-appointments register.
                </p>
                <div className="sim-list">
                  {network.connections.map((conn) => (
                    <Link key={conn.number} href={`/company/${conn.number}`} className="sim-row">
                      <div className="sim-row__main">
                        <div className="sim-row__name">{conn.name}</div>
                        <div className="sim-row__meta mono">
                          {conn.number}
                          {conn.sector ? ` · ${conn.sector}` : ""} · via {conn.viaDirectors.join(", ")}
                        </div>
                      </div>
                      <Icon name="chevronRight" size={15} className="sim-row__chev" />
                    </Link>
                  ))}
                </div>
              </>
            ) : network ? (
              <p className="icard__note" style={{ marginTop: 0 }}>
                None of this company&rsquo;s directors run another active company on the register.
              </p>
            ) : (
              <>
                <p className="icard__note" style={{ marginTop: 0 }}>
                  Other companies run by the same directors are checked on paid plans — each appointment is a separate
                  register lookup.
                </p>
                <div className="icard__foot">
                  <Link className="icard__cta" href={signedIn ? "/app/upgrade" : "/pricing"}>
                    See plans <Icon name="arrowRight" size={13} />
                  </Link>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          subtitle="People &amp; control"
          title="Who runs and owns it"
          action={<Badge tone="neutral">{officers.length + pscs.length}</Badge>}
        />
        <CardBody>
          <div className="officer-list">
            {officers.length ? (
              officers.map((p, i) => <OfficerRow key={i} p={p} unlocked={unlocked} />)
            ) : (
              <div className="reg-empty">
                <div className="reg-empty__title">No directors indexed</div>
                <div className="reg-empty__sub">Appointments can lag the register by a few days after incorporation.</div>
              </div>
            )}
          </div>
          <div className="reg-split" />
          <div className="officer-list">
            {pscs.length ? (
              pscs.map((p, i) => (
                <div className="officer" key={i}>
                  <CompanyAvatar name={p.name} size="sm" tone={p.kind === "individual" ? 2 : 0} />
                  <div className="officer__meta">
                    <div className="officer__name">{p.name}</div>
                    <div className="profile-tags" style={{ marginTop: 4 }}>
                      {p.naturesOfControl.length ? (
                        p.naturesOfControl.map((n) => (
                          <Badge key={n} tone="neutral">
                            {n}
                          </Badge>
                        ))
                      ) : (
                        <span className="officer__role">No control detail</span>
                      )}
                    </div>
                  </div>
                  <StatusPill status={p.active ? "active" : "dissolved"} />
                </div>
              ))
            ) : (
              <div className="reg-empty">
                <div className="reg-empty__title">No PSC statement filed</div>
                <div className="reg-empty__sub">Normal within 14 weeks of incorporation — a disclosure gap after that.</div>
              </div>
            )}
          </div>
          <div className="reg-split" />
          {charges.length ? (
            charges.map((ch, i) => (
              <div className="charge" key={i} style={{ marginBottom: 18 }}>
                <div className="charge__head">
                  <Icon name="shield" size={18} color="var(--warn)" />
                  <span className="charge__title">{ch.classification}</span>
                  <Badge tone={ch.status.includes("satisf") ? "neutral" : "warn"}>{ch.status}</Badge>
                </div>
                <dl className="detail-list">
                  <div>
                    <dt>Created</dt>
                    <dd className="mono">{fmtDate(ch.created)}</dd>
                  </div>
                  <div>
                    <dt>Registered</dt>
                    <dd className="mono">{fmtDate(ch.delivered)}</dd>
                  </div>
                  <div>
                    <dt>Persons entitled</dt>
                    <dd>{ch.personsEntitled?.length ? ch.personsEntitled.join(", ") : "—"}</dd>
                  </div>
                </dl>
              </div>
            ))
          ) : (
            <div className="reg-empty">
              <div className="reg-empty__title">No charges registered</div>
              <div className="reg-empty__sub">
                Nothing is secured against this company&rsquo;s assets on the Companies House register.
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
