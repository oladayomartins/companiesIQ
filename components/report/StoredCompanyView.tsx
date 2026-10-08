// The company page when Companies House is rate-limiting us and we hold a
// substantial stored copy (lib/data.ts getStoredCompany).
//
// Deliberately partial: only what the stored row holds, labelled as a stored
// copy with its date. No score, no brief, no tabs — those need directors,
// filings and ownership, and computing them from missing data would state
// things the register doesn't say (e.g. "no directors appointed").
import Link from "next/link";
import { Button, StatusPill, Icon } from "@/components/ds";
import type { StoredCompany } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { slugify } from "@/lib/slug";

export function StoredCompanyView({ c }: { c: StoredCompany }) {
  const place = [c.region, c.nation].filter((x) => x && x !== "Unknown").join(", ");
  const due = (d: string | null, overdue: boolean | null) =>
    d ? `${overdue ? "Overdue, was due" : "Next due"} ${fmtDate(d)}` : "—";
  const rows: [string, React.ReactNode][] = [
    ["Company number", <span className="mono" key="n">{c.number}</span>],
    ["Status", <StatusPill status={c.status} key="s" />],
    ["Incorporated", <span className="mono" key="i">{fmtDate(c.incorporated)}</span>],
    ...(c.dissolved ? ([["Dissolved", <span className="mono" key="d">{fmtDate(c.dissolved)}</span>]] as [string, React.ReactNode][]) : []),
    ...(c.type ? ([["Company type", c.type]] as [string, React.ReactNode][]) : []),
    [
      "Nature of business",
      c.sicCodes.length ? `${c.sicCodes.join(", ")}${c.category ? ` — ${c.category}` : ""}` : "—",
    ],
    ...(place ? ([["Region", place]] as [string, React.ReactNode][]) : []),
    ...(c.postcode ? ([["Registered office postcode", <span className="mono" key="p">{c.postcode}</span>]] as [string, React.ReactNode][]) : []),
    ...(c.filingCheckedAt
      ? ([
          ["Accounts", due(c.accountsNextDue, c.accountsOverdue)],
          ["Confirmation statement", due(c.confirmationNextDue, c.confirmationOverdue)],
        ] as [string, React.ReactNode][])
      : []),
  ];

  return (
    <div className="screen profile">
      <div className="profile-head">
        <div className="profile-head__main">
          <div className="profile-head__title-row">
            <h1 className="profile-name">{c.name}</h1>
            <StatusPill status={c.status} />
          </div>
        </div>
      </div>

      <div className="meter-note" role="status">
        <Icon name="clock" size={14} />
        <span>
          <strong>Showing our stored copy.</strong> Live details from Companies House are briefly unavailable
          {c.updatedAt ? ` — this record was last updated ${fmtDate(c.updatedAt)}` : ""}. Directors, filings and the
          full report will be back in a few minutes.
        </span>
      </div>

      <dl className="detail-list" style={{ marginTop: 18 }}>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
        <Button href={`/company/${c.number}`} variant="primary" iconRight="arrowRight">
          Try the full report again
        </Button>
        {c.sector ? (
          <Button href={`/industry/${slugify(c.sector)}`} variant="secondary">
            {c.sector} industry
          </Button>
        ) : null}
        <Button href="/search" variant="secondary">
          Search companies
        </Button>
      </div>

      <p className="profile-disclaimer">
        Stored from the Companies House register (Open Government Licence). Nothing here is inferred; fields we
        don&rsquo;t hold are left out. <Link href="/sources">Sources &amp; methodology</Link>.
      </p>
    </div>
  );
}
