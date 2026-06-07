import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardHeader, CardBody, Stat, StatusPill, Badge, CompanyAvatar, Icon } from "@/components/ds";
import { getOfficerProfile } from "@/lib/data";
import { analyzeOfficer, tierTone } from "@/lib/directors";
import { fmtDate, fmtNumber } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getOfficerProfile(id);
  return { title: p ? `${p.name} · Director · CompaniesIQ` : "Director · CompaniesIQ" };
}

export default async function DirectorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getOfficerProfile(id);
  if (!profile) notFound();
  const insight = analyzeOfficer(profile);

  return (
    <div className="screen profile">
      <Link className="back" href="/app/companies">
        <Icon name="arrowRight" size={15} style={{ transform: "rotate(180deg)" }} /> Back
      </Link>

      <div className="profile-head">
        <CompanyAvatar name={profile.name} size="xl" tone={profile.isCorporate ? 0 : 2} />
        <div className="profile-head__main">
          <div className="profile-head__title-row">
            <h1 className="profile-name">{profile.name}</h1>
            <Badge tone={tierTone(insight.tier)} dot>
              {insight.tier === "Single" ? "Director" : `${insight.tier} ${profile.isCorporate ? "officer" : "founder"}`}
            </Badge>
          </div>
          <div className="profile-meta mono">
            {profile.dateOfBirth ? (
              <>
                <span>Born {profile.dateOfBirth}</span>
                <span className="dot">·</span>
              </>
            ) : null}
            {profile.nationality ? (
              <>
                <span>{profile.nationality}</span>
                <span className="dot">·</span>
              </>
            ) : null}
            <span>{profile.occupation || (profile.isCorporate ? "Corporate officer" : "Officer")}</span>
          </div>
        </div>
      </div>

      <div className="profile-kpis">
        <Stat label="Total appointments" value={fmtNumber(insight.total)} />
        <Stat label="Active now" value={fmtNumber(insight.active)} />
        <Stat label="Ceased / dissolved" value={fmtNumber(insight.dissolved)} />
        <Stat label="First appointed" value={insight.firstAppointed ? insight.firstAppointed.slice(0, 4) : "—"} />
      </div>

      {insight.isSerial ? (
        <div className="insight" style={{ marginTop: 18 }}>
          <span className="insight__icon">
            <Icon name="users" size={18} />
          </span>
          <span className="insight__text">
            <strong>{insight.note}</strong> Serial founders are a strong prospecting and risk signal — they often start
            their next venture before competitors notice.
          </span>
        </div>
      ) : null}

      <div style={{ marginTop: 18 }}>
        <Card>
          <CardHeader subtitle="Companies House" title="Appointments across the register" action={<Badge tone="accent">{insight.total}</Badge>} />
          <CardBody flush>
            <div className="table-scroll"><table className="data-table data-table--full">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Appointed</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {profile.appointments.map((a, i) => (
                  <tr key={i}>
                    <td>
                      <Link href={`/company/${a.companyNumber}`} className="cell-co" style={{ textDecoration: "none" }}>
                        <CompanyAvatar name={a.companyName} size="sm" />
                        <div>
                          <div className="cell-co__name">{a.companyName}</div>
                          <div className="cell-co__no">{a.companyNumber}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="muted">{a.role}</td>
                    <td className="mono">{fmtDate(a.appointed)}</td>
                    <td>
                      {a.active ? <span className="appt-active mono">● Active</span> : <span className="appt-ceased mono">Ceased {a.resigned ? a.resigned.slice(0, 4) : ""}</span>}
                    </td>
                    <td className="num">
                      <Icon name="chevronRight" size={16} color="var(--text-faint)" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </CardBody>
        </Card>
      </div>
      <div className="report__disclaimer">Source · Companies House officer appointments. Evidence-only — reflects the public register.</div>
    </div>
  );
}
