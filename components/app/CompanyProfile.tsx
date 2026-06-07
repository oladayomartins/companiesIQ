"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody, Tabs, Stat, StatusPill, Badge, Tag, CompanyAvatar, Icon, Button, IconButton } from "@/components/ds";
import { IntelligenceReport } from "@/components/app/IntelligenceReport";
import type { Company, Officer, Filing, Charge, PSC } from "@/lib/types";
import type { IntelligenceReport as Report, SimilarCompany } from "@/lib/analytics";
import type { CompanyEnrichment } from "@/lib/enrichment/types";
import { fmtDate, ageLabel } from "@/lib/format";

function OfficerRow({ p }: { p: Officer }) {
  const inner = (
    <>
      <CompanyAvatar name={p.name} size="sm" tone={p.kind === "company" ? 0 : 2} />
      <div className="officer__meta">
        <div className="officer__name">{p.name}</div>
        <div className="officer__role">{p.role}</div>
      </div>
      <div className="officer__date mono">{fmtDate(p.appointed)}</div>
      <StatusPill status={p.status === "resigned" ? "dissolved" : "active"} />
      {p.officerId ? <Icon name="chevronRight" size={15} className="officer__chev" /> : null}
    </>
  );
  if (p.officerId) {
    return (
      <Link className="officer is-link" href={`/app/director/${p.officerId}`} style={{ textDecoration: "none" }}>
        {inner}
      </Link>
    );
  }
  return <div className="officer">{inner}</div>;
}

export function CompanyProfile({
  company,
  officers,
  filings,
  charges,
  pscs,
  report,
  similar = [],
  enrichment = null,
  live,
}: {
  company: Company;
  officers: Officer[];
  filings: Filing[];
  charges: Charge[];
  pscs: PSC[];
  report: Report;
  similar?: SimilarCompany[];
  enrichment?: CompanyEnrichment | null;
  live: boolean;
}) {
  const c = company;
  const router = useRouter();
  const [tab, setTab] = useState("intelligence");

  const tags = c.classifications.slice(0, 3).map((cl) => cl.category);
  const addressParts = c.address
    ? [c.address.line1, c.address.line2, c.address.locality, c.address.postcode].filter(Boolean).join(", ")
    : "—";

  return (
    <div className="screen profile">
      <button className="back" onClick={() => router.push("/app/companies")}>
        <Icon name="arrowRight" size={15} style={{ transform: "rotate(180deg)" }} /> Back to results
      </button>

      <div className="profile-head">
        <CompanyAvatar name={c.name} size="xl" />
        <div className="profile-head__main">
          <div className="profile-head__title-row">
            <h1 className="profile-name">{c.name}</h1>
            <StatusPill status={c.status} />
            {!live ? <Badge tone="warn">Sample</Badge> : <Badge tone="pos" dot>Live</Badge>}
          </div>
          <div className="profile-meta mono">
            <span>No. {c.number}</span>
            <span className="dot">·</span>
            <span>Inc. {fmtDate(c.incorporated)}</span>
            {c.type ? (
              <>
                <span className="dot">·</span>
                <span>{c.type}</span>
              </>
            ) : null}
            <span className="dot">·</span>
            <span>
              <Icon name="pin" size={13} /> {c.geo?.region ?? "—"}
            </span>
          </div>
          <div className="profile-tags">
            {tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        </div>
        <div className="profile-actions">
          <Button variant="secondary" iconLeft="bookmark">
            Watch
          </Button>
          <Button variant="secondary" iconLeft="trendUp" onClick={() => router.push(`/company/${c.number}/growth-report`)}>
            Founder view
          </Button>
          <Button variant="primary" iconLeft="download">
            Export report
          </Button>
        </div>
      </div>

      <div className="profile-kpis">
        <Stat label="SIC code" value={c.sicCodes[0] ?? "—"} sub={c.primaryClassification?.category} />
        <Stat label="Sector" value={c.primaryClassification?.sector ?? "—"} />
        <Stat label="Nation" value={c.geo?.nation ?? "—"} sub={c.geo?.region} />
        <Stat label="Age" value={ageLabel(c.incorporated)} />
      </div>

      <div className="profile-tabs">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "intelligence", label: "Intelligence", icon: "barChart" },
            { id: "overview", label: "Overview" },
            { id: "people", label: "People", icon: "users", count: officers.length + pscs.length },
            { id: "filings", label: "Filing history", count: filings.length },
            { id: "charges", label: "Charges", count: charges.length },
          ]}
        />
      </div>

      {tab === "intelligence" ? <IntelligenceReport report={report} similar={similar} enrichment={enrichment} /> : null}

      {tab === "overview" ? (
        <div className="profile-grid">
          <Card>
            <CardHeader subtitle="Snapshot" title="Company details" />
            <CardBody>
              <dl className="detail-list">
                <div>
                  <dt>Registered office</dt>
                  <dd>{addressParts}</dd>
                </div>
                <div>
                  <dt>Company type</dt>
                  <dd>{c.type || "—"}</dd>
                </div>
                <div>
                  <dt>Incorporated</dt>
                  <dd className="mono">{fmtDate(c.incorporated)}</dd>
                </div>
                <div>
                  <dt>Nature of business</dt>
                  <dd>
                    {c.sicCodes.length
                      ? c.classifications.map((cl) => `${cl.code} — ${cl.category}`).join("; ")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <StatusPill status={c.status} />
                  </dd>
                </div>
                <div>
                  <dt>Region / nation</dt>
                  <dd>
                    {c.geo?.region} · {c.geo?.nation}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader subtitle="Companies House" title="Recent activity" action={<Badge tone="accent">{live ? "Live" : "Sample"}</Badge>} />
            <CardBody flush>
              <div className="mini-feed">
                {filings.slice(0, 6).map((f, i) => (
                  <div className="mini-feed__row" key={i}>
                    <span className="mini-feed__date mono">{fmtDate(f.date)}</span>
                    <Badge tone="neutral">{f.type}</Badge>
                    <span className="mini-feed__label">{f.label}</span>
                  </div>
                ))}
                {filings.length === 0 ? <div className="mini-feed__row"><span className="mini-feed__label muted">No filings available.</span></div> : null}
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === "people" ? (
        <div className="profile-grid">
          <Card>
            <CardHeader subtitle="Officers" title="Directors & secretaries" action={<Badge tone="neutral">{officers.length}</Badge>} />
            <CardBody>
              <div className="officer-list">
                {officers.length ? officers.map((p, i) => <OfficerRow key={i} p={p} />) : <span className="muted">No officers on record.</span>}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader subtitle="Ownership" title="Persons with significant control" action={<Badge tone="accent">{pscs.length}</Badge>} />
            <CardBody>
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
                  <span className="muted">No persons with significant control on record.</span>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === "filings" ? (
        <Card>
          <CardHeader subtitle="Companies House" title="Filing history" action={<IconButton icon="download" variant="solid" label="Export" />} />
          <CardBody flush>
            <div className="table-scroll"><table className="data-table data-table--full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filings.map((f, i) => (
                  <tr key={i}>
                    <td className="mono">{fmtDate(f.date)}</td>
                    <td>
                      <Badge tone="neutral">{f.type}</Badge>
                    </td>
                    <td>{f.label}</td>
                  </tr>
                ))}
                {filings.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan={3}>No filing history available.</td>
                  </tr>
                ) : null}
              </tbody>
            </table></div>
          </CardBody>
        </Card>
      ) : null}

      {tab === "charges" ? (
        <Card>
          <CardHeader subtitle="Secured lending" title="Charges" />
          <CardBody>
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
              <span className="muted">No charges registered against this company.</span>
            )}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
