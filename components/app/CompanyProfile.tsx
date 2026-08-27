"use client";
// The company report. One page, five tabs, and a LENS that decides what the
// numbers mean:
//
//   Intelligence  the verdict — score, brief, what changed, fingerprint, market
//                 and competitive cards, the lens's own card, next steps
//   <lens>        what is actually evidenced for the user's use case
//   Market        is this market big, growing and survivable
//   Competitors   how crowded is it, and where does this company sit
//   Records       what is formally on the register — and what is not filed yet
//
// Colour is semantic only: green/amber/red mean good/watch/risk, never
// decoration. Every score row carries its weight and its reason, and anything
// we could not measure says "Not checked" rather than being guessed.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody, Tabs, StatusPill, Badge, Tag, CompanyAvatar, Icon, Button, IconButton } from "@/components/ds";
import { IntelligenceReport } from "@/components/app/IntelligenceReport";
import type { Company, Officer, Filing, Charge, PSC } from "@/lib/types";
import type { IntelligenceReport as Report, SimilarCompany } from "@/lib/analytics";
import type { CompanyEnrichment } from "@/lib/enrichment/types";
import { buildOpportunity } from "@/lib/opportunity";
import { WatchButton } from "@/components/app/WatchButton";
import type { DirectorNetwork } from "@/lib/network";
import { toCSV, downloadCSV } from "@/lib/csv";
import { toast } from "@/lib/toast";
import { fmtDate } from "@/lib/format";
import { slugify } from "@/lib/slug";
import {
  LENSES,
  lensForProfile,
  scoreLens,
  scorePeerLite,
  bucketIndex,
  PEER_BUCKETS,
  shortAge,
  type LensInput,
  type Tone,
} from "@/lib/lens";
import { buildBrief, buildEvidence, buildActions, buildLensCard, relevantTo } from "@/lib/lens-view";
import { LensBar, useLensProfile } from "@/components/app/LensBar";
import { LensScoreCard, Fingerprint, type FingerprintCell } from "@/components/app/LensScore";

const DAY = 86_400_000;
const num = (n: number) => n.toLocaleString("en-GB");
const pc = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const toneClass = (t: Tone) => `is-${t}`;

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

/** A small "k / v" run used by the market, competitive and lens cards. */
function MiniRows({ rows }: { rows: { k: string; v: string }[] }) {
  return (
    <div className="minirows">
      {rows.map((r) => (
        <div className="minirows__row" key={r.k}>
          <span className="minirows__k">{r.k}</span>
          <span className="minirows__v mono">{r.v}</span>
        </div>
      ))}
    </div>
  );
}

/** 10 quarters of sector formations — the past greyed, the recent trend in accent. */
function Sparkline({ points, label }: { points: number[]; label: string }) {
  const w = 260;
  const h = 46;
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const span = Math.max(max - min, 1);
  const xy = points.map((p, i) => [(i / (points.length - 1)) * w, h - ((p - min) / span) * (h - 6) - 3] as const);
  const d = (from: number, to: number) =>
    xy
      .slice(from, to)
      .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(" ");
  const split = Math.max(points.length - 4, 1);
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} preserveAspectRatio="none">
      <path className="spark__past" d={d(0, split + 1)} fill="none" />
      <path className="spark__now" d={d(split, points.length)} fill="none" />
    </svg>
  );
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
  unlocked = false,
  partner = false,
  signedIn = false,
  watched = false,
  network = null,
  savedLens = null,
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
  unlocked?: boolean;
  partner?: boolean;
  signedIn?: boolean;
  watched?: boolean;
  network?: DirectorNetwork | null;
  savedLens?: string | null;
}) {
  const c = company;
  const router = useRouter();
  const [tab, setTab] = useState("intelligence");

  // Lens: the Pro user's saved default, overridden by a per-session switch.
  const { profileKey, otherText, choose } = useLensProfile(savedLens);
  const lensKey = lensForProfile(profileKey);
  const lens = LENSES[lensKey];

  const lensInput: LensInput = useMemo(
    () => ({ company: c, officers, filings, charges, pscs, report, enrichment }),
    [c, officers, filings, charges, pscs, report, enrichment]
  );
  const score = useMemo(() => scoreLens(lensInput, lensKey), [lensInput, lensKey]);
  const brief = useMemo(() => buildBrief(lensInput, score), [lensInput, score]);
  const evidence = useMemo(() => buildEvidence(lensInput, score), [lensInput, score]);
  const actions = useMemo(() => buildActions(lensInput, score, { unlocked }), [lensInput, score, unlocked]);
  const lensCard = useMemo(() => buildLensCard(lensInput, score), [lensInput, score]);
  const relevant = useMemo(() => relevantTo(lensInput, lensKey), [lensInput, lensKey]);

  // Kept for the Pro intelligence report, which still reads the original model.
  const opportunity = useMemo(
    () =>
      buildOpportunity(
        c,
        {
          directors: officers.filter((o) => o.status === "active").length,
          pscs: pscs.filter((p) => p.active).length,
          charges: charges.length,
        },
        enrichment
      ),
    [c, officers, pscs, charges, enrichment]
  );

  const peers = useMemo(
    () => similar.map((p) => ({ ...p, ...scorePeerLite(p, lensKey) })),
    [similar, lensKey]
  );
  const distribution = useMemo(() => {
    const buckets = new Array(PEER_BUCKETS.length).fill(0) as number[];
    for (const p of peers) buckets[bucketIndex(p.score)] += 1;
    return buckets;
  }, [peers]);
  const selfBucket = bucketIndex(score.score);

  const incDays = c.incorporated ? Math.floor((Date.now() - Date.parse(c.incorporated)) / DAY) : null;
  const daysTo = (iso?: string) => (iso ? Math.round((Date.parse(iso) - Date.now()) / DAY) : null);
  const accountsDays = daysTo(c.accounts?.nextDue);
  const hasFiledAccounts = !!c.accounts?.lastMadeUpTo || filings.some((f) => f.type === "AA");

  function exportReport() {
    const rows: (string | number | null | undefined)[][] = [
      ["Company", c.name],
      ["Company number", c.number],
      ["Status", c.status],
      ["Incorporated", c.incorporated ?? ""],
      ["Type", c.type ?? ""],
      ["Sector", c.primaryClassification?.sector ?? ""],
      ["Region", c.geo?.region ?? ""],
      ["Lens", lens.label],
      ["Lens score", score.score],
      ["Lens verdict", score.verdict],
      ["Model coverage", `${score.coverage}%`],
      ...score.ledger.map((r) => [`Signal · ${r.label} (${r.weight}%)`, r.measured ? `${r.state} — ${r.reason}` : "Not checked"]),
      ["Accounts next due", c.accounts?.nextDue ?? ""],
      ["Accounts overdue", c.accounts?.overdue ? "yes" : "no"],
      ["Confirmation statement next due", c.confirmationStatement?.nextDue ?? ""],
      ["Active directors", officers.filter((o) => o.status === "active").length],
      ["PSCs", pscs.filter((p) => p.active).length],
      ["Charges registered", charges.length],
    ];
    downloadCSV(`companiesiq-${c.number}.csv`, toCSV(["Field", "Value"], rows));
    toast("Report exported to CSV", { tone: "info" });
  }
  function exportFilings() {
    downloadCSV(
      `companiesiq-${c.number}-filings.csv`,
      toCSV(["Date", "Type", "Description"], filings.map((f) => [f.date, f.type, f.label]))
    );
    toast(`Exported ${filings.length} filing${filings.length === 1 ? "" : "s"} to CSV`, { tone: "info" });
  }

  const tags = c.classifications.slice(0, 3).map((cl) => cl.category);
  const addressParts = c.address
    ? [c.address.line1, c.address.line2, c.address.locality, c.address.postcode].filter(Boolean).join(", ")
    : "—";

  // Plain-language summary, derived entirely from the free register data — gives
  // each public page unique, answer-first prose for indexing and AI answers.
  const statusKey = (c.status ?? "").toLowerCase();
  const article = (w: string) => (/^[aeiou]/i.test(w) ? "an" : "a");
  const typePhrase = c.type ? c.type.toLowerCase().replace(/-/g, " ") : "company";
  let lead: string;
  if (statusKey === "active" || statusKey === "dissolved") {
    lead = `${c.name} is ${article(statusKey)} ${statusKey} ${typePhrase}`;
  } else if (statusKey === "liquidation" || statusKey === "administration") {
    lead = `${c.name} is ${article(typePhrase)} ${typePhrase} in ${statusKey}`;
  } else {
    lead = `${c.name} is ${article(typePhrase)} ${typePhrase}`;
  }
  const place = [
    ...new Set(
      [c.geo?.locality, c.geo?.region].map((p) => p?.trim()).filter((p): p is string => !!p && p !== "Unknown")
    ),
  ].join(", ");
  const summarySector = c.primaryClassification?.sector;
  const newlyIncorporated = statusKey === "active" && incDays != null && incDays >= 0 && incDays <= 90;
  const agoText = (days: number): string => {
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 31) return `${days} days ago`;
    const m = Math.floor(days / 30.44);
    if (m < 12) return `${m === 1 ? "1 month" : `${m} months`} ago`;
    const y = Math.floor(days / 365.25);
    return `${y === 1 ? "1 year" : `${y} years`} ago`;
  };
  const summary =
    lead +
    (c.incorporated ? ` incorporated on ${fmtDate(c.incorporated)}` : "") +
    (place ? `, with its registered office in ${place}` : "") +
    "." +
    (incDays != null ? ` It was registered ${agoText(incDays)}.` : "") +
    (summarySector ? ` The company operates in ${summarySector}.` : "");

  const fmtDue = (d?: { nextDue?: string; overdue?: boolean }) =>
    d?.nextDue ? `${d.overdue ? "Overdue, was due" : "Next due"} ${fmtDate(d.nextDue)}` : "—";

  // The fingerprint indexes five fixed dimensions so the shape of a company is
  // comparable across lenses; only the last cell moves with the lens.
  const fingerprint: FingerprintCell[] = [
    {
      label: "Financial",
      value: hasFiledAccounts ? 62 : 22,
      trend: hasFiledAccounts ? "up" : "flat",
      state: hasFiledAccounts ? "Filed" : "No accounts yet",
      tone: hasFiledAccounts ? "good" : "watch",
    },
    {
      label: "Growth",
      value: Math.max(0, Math.min(100, Math.round(50 + report.industry.annualGrowth * 8))),
      trend: report.industry.annualGrowth >= 0 ? "up" : "down",
      state: report.industry.annualGrowth >= 1 ? "Positive" : report.industry.annualGrowth >= 0 ? "Flat" : "Negative",
      tone: report.industry.annualGrowth >= 1 ? "good" : report.industry.annualGrowth >= 0 ? "watch" : "risk",
    },
    {
      label: "Market",
      value: Math.max(0, Math.min(100, Math.round(report.survival.fiveYear * 1.6 + 20))),
      trend: report.regional.regionalGrowth >= report.regional.nationalGrowth ? "up" : "down",
      state: report.regional.regionalGrowth >= report.regional.nationalGrowth ? "Attractive" : "Behind national",
      tone: report.regional.regionalGrowth >= report.regional.nationalGrowth ? "good" : "watch",
    },
    {
      label: "Compliance",
      value: c.accounts?.overdue || c.confirmationStatement?.overdue ? 30 : 88,
      trend: c.accounts?.overdue || c.confirmationStatement?.overdue ? "down" : "up",
      state: c.accounts?.overdue || c.confirmationStatement?.overdue ? "Overdue" : "Clean",
      tone: c.accounts?.overdue || c.confirmationStatement?.overdue ? "risk" : "good",
    },
    {
      label: "Competition",
      value:
        report.local.density === "Very high" ? 92 : report.local.density === "High" ? 76 : report.local.density === "Moderate" ? 52 : 28,
      trend: "flat",
      state: report.local.density === "Very high" || report.local.density === "High" ? "Headwind" : "Manageable",
      tone: report.local.density === "Very high" || report.local.density === "High" ? "risk" : "good",
    },
  ];

  // Sector formations over 10 quarters, shaped from the sector's own annual
  // growth rate — the same figure the market card states, drawn instead of
  // asserted. Marked as modelled in the card's source line.
  const sparkPoints = useMemo(() => {
    const base = Math.max(report.industry.newLastYear / 4, 1);
    const q = report.industry.annualGrowth / 400;
    return Array.from({ length: 10 }, (_, i) => base * Math.pow(1 + q, i - 9) * (1 + ((i % 3) - 1) * 0.03));
  }, [report.industry.newLastYear, report.industry.annualGrowth]);

  const regionalAhead = report.regional.regionalGrowth > report.regional.nationalGrowth;

  return (
    <div className="screen profile">
      {unlocked ? (
        <button className="back" onClick={() => router.push("/search")}>
          <Icon name="arrowRight" size={15} style={{ transform: "rotate(180deg)" }} /> Back to results
        </button>
      ) : null}

      <div className="profile-head">
        <CompanyAvatar name={c.name} size="xl" />
        <div className="profile-head__main">
          <div className="profile-head__title-row">
            <h1 className="profile-name">{c.name}</h1>
            <StatusPill status={c.status} />
            {newlyIncorporated ? <Badge tone="accent">Newly incorporated</Badge> : null}
            {!live ? <Badge tone="warn">Sample</Badge> : <Badge tone="pos" dot>Live</Badge>}
          </div>
          <div className="profile-meta mono">
            <span>No. {c.number}</span>
            <span className="dot">/</span>
            <span>Inc. {fmtDate(c.incorporated)}</span>
            {c.sicCodes[0] ? (
              <>
                <span className="dot">/</span>
                <span>
                  SIC {c.sicCodes[0]}
                  {c.primaryClassification?.category ? ` · ${c.primaryClassification.category}` : ""}
                </span>
              </>
            ) : null}
            <span className="dot">/</span>
            <span>
              <Icon name="pin" size={13} /> {[c.geo?.locality, c.geo?.region].filter((x) => x && x !== "Unknown").join(", ") || "—"}
            </span>
          </div>
          <div className="profile-tags">
            {tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        </div>
        <div className="profile-actions">
          {unlocked ? (
            <>
              <WatchButton companyNumber={c.number} initialWatched={watched} />
              {partner ? (
                <Button variant="secondary" iconLeft="trendUp" onClick={() => router.push(`/visibility-review/${c.number}`)}>
                  Founder view
                </Button>
              ) : null}
              <Button variant="primary" iconLeft="download" onClick={exportReport}>
                Export report
              </Button>
            </>
          ) : (
            <Link href={signedIn ? "/app/upgrade" : "/pricing"}>
              <Button variant="primary" iconRight="arrowRight">
                Go Pro
              </Button>
            </Link>
          )}
        </div>
      </div>

      <p className="profile-summary">{summary}</p>

      <LensBar
        profileKey={profileKey}
        otherText={otherText}
        onChoose={choose}
        savedDefault={savedLens}
        canSave={unlocked}
        signedIn={signedIn}
      />

      {c.primaryClassification?.sector || (c.geo?.region && c.geo.region !== "Unknown") ? (
        <div className="profile-related">
          {c.primaryClassification?.sector ? (
            <Link href={`/industry/${slugify(c.primaryClassification.sector)}`}>
              <Icon name="barChart" size={14} /> {c.primaryClassification.sector} industry
            </Link>
          ) : null}
          {c.geo?.region && c.geo.region !== "Unknown" ? (
            <Link href={`/market/${slugify(c.geo.region)}`}>
              <Icon name="pin" size={14} /> {c.geo.region} market
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="profile-tabs profile-tabs--lens">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "intelligence", label: "Intelligence", icon: "barChart" },
            { id: "lens", label: lens.tab },
            { id: "market", label: "Market" },
            { id: "competitors", label: "Competitors", count: peers.length || undefined },
            { id: "records", label: "Records", count: filings.length + officers.length + charges.length },
          ]}
        />
        <div className="profile-tabs__meta mono">
          <span>Lens · {lens.label}</span>
          <span className="dot">|</span>
          <span>Confidence {score.confidence}</span>
        </div>
      </div>

      {tab === "intelligence" ? (
        <div className="intel">
          <div className="intel__row2">
            <LensScoreCard score={score} delta={`${score.coverage}% of model measurable`} />

            <Card>
              <CardBody>
                <div className="brief__head">
                  <span className="app-eyebrow">Company brief</span>
                  <Badge tone="neutral">For {lens.label}</Badge>
                </div>
                <p className="brief__prose">{brief.prose}</p>
                <div className="brief__points">
                  {brief.points.map((p) => (
                    <div className={`brief__point ${toneClass(p.tone)}`} key={p.n}>
                      <span className="brief__n mono">{p.n}</span>
                      <div>
                        <div className="brief__title">{p.title}</div>
                        <div className="brief__text">{p.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="brief__foot">
                  <Button variant="secondary" onClick={() => setTab("lens")}>
                    View evidence
                  </Button>
                  <span className="brief__disclaimer mono">Interpretation, not advice</span>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="changed">
            <div className="changed__head">
              <span className="app-eyebrow">What&rsquo;s changed</span>
              <span className="changed__sub mono">Register &amp; sector</span>
            </div>
            <div className="changed__items">
              <div className="changed__item">
                <span className="changed__k mono">Sector growth</span>
                <span className={`changed__v ${report.industry.annualGrowth >= 0 ? "is-good" : "is-risk"}`}>
                  {pc(report.industry.annualGrowth)}
                </span>
              </div>
              <div className="changed__item">
                <span className="changed__k mono">Confirmation statement</span>
                <span className={`changed__v ${c.confirmationStatement?.overdue ? "is-risk" : "is-good"}`}>
                  {c.confirmationStatement?.overdue ? "Overdue" : "Current"}
                </span>
              </div>
              <div className="changed__item">
                <span className="changed__k mono">{newlyIncorporated ? "Newly incorporated" : "Age"}</span>
                <span className="changed__v">{incDays != null ? shortAge(incDays) : "—"}</span>
              </div>
              <div className="changed__item">
                <span className="changed__k mono">Regional density</span>
                <span className="changed__v">{report.local.density}</span>
              </div>
            </div>
            <button className="changed__cta" onClick={() => setTab("lens")}>
              View all signals <Icon name="arrowRight" size={13} />
            </button>
          </div>

          <Fingerprint cells={fingerprint} peers={report.industry.businesses} lensKey={lensKey} lensScore={score} />

          <div className="intel__row2">
            <Card>
              <CardBody>
                <div className="icard__head">
                  <span className="app-eyebrow">Market intelligence</span>
                  <Badge tone={regionalAhead ? "pos" : "warn"}>{regionalAhead ? "Tailwind" : "Headwind"}</Badge>
                </div>
                <MiniRows
                  rows={[
                    { k: "Companies in sector", v: num(report.industry.businesses) },
                    { k: "National growth", v: pc(report.regional.nationalGrowth) },
                    { k: `${report.local.region} growth`, v: pc(report.regional.regionalGrowth) },
                  ]}
                />
                <div className="icard__spark">
                  <Sparkline points={sparkPoints} label="Sector formations over 10 quarters" />
                  <div className="icard__sparkAxis mono">
                    <span>10 quarters ago</span>
                    <span>Sector formations</span>
                    <span>Now</span>
                  </div>
                </div>
                <p className="icard__note">{report.regional.insight}</p>
                <div className="icard__foot">
                  <button className="icard__cta" onClick={() => setTab("market")}>
                    View market intelligence <Icon name="arrowRight" size={13} />
                  </button>
                  <span className="icard__src mono">ONS · modelled trend</span>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="icard__head">
                  <span className="app-eyebrow">Competitive landscape</span>
                  <Badge tone={report.local.density === "Very high" || report.local.density === "High" ? "warn" : "pos"}>
                    {report.local.density === "Very high" || report.local.density === "High" ? "Headwind" : "Manageable"}
                  </Badge>
                </div>
                <MiniRows
                  rows={[
                    { k: `Comparables (${report.local.region})`, v: num(report.local.inSameIndustry) },
                    { k: "Sector total (UK)", v: num(report.industry.businesses) },
                    { k: "5-yr survival", v: `${report.survival.fiveYear.toFixed(1)}%` },
                  ]}
                />
                <p className="icard__note">
                  {report.local.density === "Very high" || report.local.density === "High"
                    ? "Crowded and attritional. Differentiation matters more than market timing here."
                    : "Room to move — the region is not saturated for this trade."}
                </p>
                <div className="icard__foot">
                  <button className="icard__cta" onClick={() => setTab("competitors")}>
                    Compare competitors <Icon name="arrowRight" size={13} />
                  </button>
                  <span className="icard__src mono">CH register</span>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardBody>
              <div className="icard__head">
                <span className="app-eyebrow">{lensCard.label}</span>
                <Badge tone={lensCard.flagTone === "good" ? "pos" : lensCard.flagTone === "risk" ? "warn" : "neutral"}>
                  {lensCard.flag}
                </Badge>
              </div>
              <div className="icard__headline">{lensCard.headline}</div>
              <MiniRows rows={lensCard.rows} />
              <p className="icard__note">{lensCard.note}</p>
              <div className="icard__foot">
                <button className="icard__cta" onClick={() => setTab("lens")}>
                  {lensCard.cta.label} <Icon name="arrowRight" size={13} />
                </button>
                <span className="icard__src mono">{lensCard.source}</span>
              </div>
            </CardBody>
          </Card>

          {!hasFiledAccounts ? (
            <Card>
              <CardBody>
                <div className="icard__head">
                  <span className="app-eyebrow">Financial intelligence</span>
                  <Badge tone="neutral">Awaiting first accounts</Badge>
                </div>
                <p className="icard__note" style={{ marginTop: 0 }}>
                  {incDays != null ? `Incorporated ${agoText(incDays)}. ` : ""}
                  {c.accounts?.nextDue
                    ? `First accounts are due ${fmtDate(c.accounts.nextDue)}.`
                    : "No accounts deadline is published yet."}{" "}
                  A new company has nothing to file for its first 21 months, so this is expected rather than a gap.
                </p>
                {accountsDays != null ? (
                  <div className="empty-metric">
                    <span className="empty-metric__label mono">Days to first filing</span>
                    <span className="empty-metric__value">{accountsDays}</span>
                  </div>
                ) : null}
                <div className="icard__foot">
                  <Link className="icard__cta" href="/app/alerts">
                    Set filing alert <Icon name="arrowRight" size={13} />
                  </Link>
                  <button className="icard__cta" onClick={() => setTab("market")}>
                    Use sector benchmarks instead <Icon name="arrowRight" size={13} />
                  </button>
                </div>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardBody>
              <div className="icard__head">
                <span className="app-eyebrow">Recommended next steps</span>
                <Badge tone="neutral">For {lens.label}</Badge>
              </div>
              <div className="steps">
                {actions.map((a) => (
                  <div className="steps__row" key={a.n}>
                    <span className="steps__n mono">{a.n}</span>
                    <span className="steps__label">{a.label}</span>
                    {a.href.startsWith("#") ? (
                      <button
                        className="steps__cta"
                        onClick={() => setTab(a.href === "#records" ? "records" : a.href === "#competitors" ? "competitors" : "lens")}
                      >
                        {a.cta} <Icon name="arrowRight" size={13} />
                      </button>
                    ) : (
                      <Link className="steps__cta" href={a.href}>
                        {a.cta} <Icon name="arrowRight" size={13} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {unlocked ? (
            <IntelligenceReport
              report={report}
              similar={similar}
              enrichment={enrichment}
              opportunity={opportunity}
              network={network}
              filings={filings}
              prospect={{
                number: c.number,
                name: c.name,
                sector: c.primaryClassification?.sector ?? null,
                region: c.geo?.region ?? null,
                score: score.score,
              }}
            />
          ) : (
            <Card className="deepgate">
              <CardBody>
                <Badge tone="accent" dot>
                  Deep intelligence · Pro
                </Badge>
                <h2 className="deepgate__title">Go Pro for the full report</h2>
                <p className="deepgate__sub">
                  Verified digital presence, director networks, keyword and regional intelligence, CSV exports, alerts
                  and watchlists across every UK company. Everything above stays free.
                </p>
                <div className="deepgate__cta">
                  <Link href={signedIn ? "/app/upgrade" : "/pricing"}>
                    <Button variant="primary" iconRight="arrowRight">
                      Go Pro
                    </Button>
                  </Link>
                  {!signedIn ? (
                    <Link href="/sign-in">
                      <Button variant="secondary">Sign in</Button>
                    </Link>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      ) : null}

      {tab === "lens" ? (
        <div className="intel">
          <p className="tab-question">
            <Icon name="arrowRight" size={13} /> Answers: {lens.question}
          </p>
          <Card>
            <CardHeader subtitle={lens.tabTitle} title={`${lens.label} lens`} action={<Badge tone="neutral">{score.coverage}% measurable</Badge>} />
            <CardBody>
              <div className="evidence">
                {evidence.map((e) => (
                  <div className={`evidence__row ${toneClass(e.tone)}`} key={e.title}>
                    <div className="evidence__main">
                      <div className="evidence__title">{e.title}</div>
                      <div className="evidence__sub">{e.sub}</div>
                    </div>
                    <span className="evidence__state mono">{e.state}</span>
                  </div>
                ))}
              </div>
              <p className="icard__note">
                Rows marked <span className="mono">Not checked</span> are excluded from the score rather than assumed —
                the missing weight shows up as lower confidence, not as a worse company.
              </p>
              <div className="icard__foot">
                {unlocked ? (
                  <Link className="icard__cta" href="/app/enrich">
                    Re-scan sources <Icon name="arrowRight" size={13} />
                  </Link>
                ) : (
                  <Link className="icard__cta" href={signedIn ? "/app/upgrade" : "/pricing"}>
                    Unlock source scanning <Icon name="arrowRight" size={13} />
                  </Link>
                )}
                <span className="icard__src mono">Model · {lens.label}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader subtitle="Commercially relevant to" title={`What a ${lens.label.toLowerCase()} seller would look at`} />
            <CardBody>
              <div className="profile-tags">
                {relevant.map((r) => (
                  <Tag key={r}>{r}</Tag>
                ))}
              </div>
              <p className="icard__note">
                These are sector norms, not detected needs. CompaniesIQ never asserts what a company requires — only what
                the register does and does not show.
              </p>
              <div className="icard__foot">
                <Link className="icard__cta" href={unlocked ? "/app/prospects" : signedIn ? "/app/upgrade" : "/pricing"}>
                  Add to prospect list <Icon name="arrowRight" size={13} />
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === "market" ? (
        <div className="intel">
          <p className="tab-question">
            <Icon name="arrowRight" size={13} /> Answers: is this market big, growing and survivable — and is the region
            ahead or behind?
          </p>
          <Card>
            <CardHeader subtitle={`Market summary · ${report.industry.sector.toLowerCase()}`} title="Sector size &amp; momentum" />
            <CardBody>
              <div className="bigstats">
                <div className="bigstat">
                  <span className="bigstat__k mono">Companies in sector</span>
                  <span className="bigstat__v">{num(report.industry.businesses)}</span>
                </div>
                <div className="bigstat">
                  <span className="bigstat__k mono">New registrations</span>
                  <span className="bigstat__v">{num(report.industry.newLastYear)}</span>
                </div>
                <div className="bigstat">
                  <span className="bigstat__k mono">Growth rate</span>
                  <span className="bigstat__v">{pc(report.industry.annualGrowth)}</span>
                </div>
                <div className="bigstat">
                  <span className="bigstat__k mono">Survival (5 yr)</span>
                  <span className="bigstat__v">{report.survival.fiveYear.toFixed(1)}%</span>
                </div>
                <div className="bigstat">
                  <span className="bigstat__k mono">Regional density</span>
                  <span className="bigstat__v">{report.local.density}</span>
                </div>
              </div>
              <p className="icard__note">{report.regional.insight}</p>
            </CardBody>
          </Card>

          <div className="intel__row2">
            <Card>
              <CardHeader subtitle="Growth &amp; survival" title="How long companies last here" />
              <CardBody>
                <MiniRows
                  rows={[
                    { k: "1-year survival", v: `${report.survival.oneYear.toFixed(1)}%` },
                    { k: "3-year survival", v: `${report.survival.threeYear.toFixed(1)}%` },
                    { k: "5-year survival", v: `${report.survival.fiveYear.toFixed(1)}%` },
                  ]}
                />
                <p className="icard__note">
                  Of every 100 companies started in this sector, roughly {Math.round(report.survival.fiveYear)} are still
                  trading five years later. That is the base rate any single company is beating or losing to.
                </p>
                <div className="icard__foot">
                  <Link className="icard__cta" href="/sources">
                    View methodology <Icon name="arrowRight" size={13} />
                  </Link>
                  <span className="icard__src mono">{report.survival.source}</span>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader subtitle={`Local economy · ${report.economic.region}`} title="The market around it" />
              <CardBody>
                <MiniRows
                  rows={[
                    { k: "Population", v: num(report.economic.population) },
                    { k: "Employment rate", v: `${report.economic.employmentRate.toFixed(1)}%` },
                    { k: "Economic activity", v: `${report.economic.economicActivityRate.toFixed(1)}%` },
                    { k: "Median weekly pay", v: `£${report.economic.medianWeeklyPay.toFixed(2)}` },
                  ]}
                />
                <div className="icard__foot">
                  <Link className="icard__cta" href="/app/markets">
                    Compare regions <Icon name="arrowRight" size={13} />
                  </Link>
                  <span className="icard__src mono">ONS · Nomis</span>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "competitors" ? (
        <div className="intel">
          <p className="tab-question">
            <Icon name="arrowRight" size={13} /> Answers: how crowded is this market, and where does this company sit
            against its peers?
          </p>
          <Card>
            <CardHeader
              subtitle={`Closest comparables · ${num(report.local.inSameIndustry)} in ${report.local.region}`}
              title="Peer companies"
              action={<Badge tone="neutral">{peers.length} scored</Badge>}
            />
            <CardBody flush>
              <div className="table-scroll">
                <table className="data-table data-table--full">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Incorporated</th>
                      <th>Location</th>
                      <th>{lens.short} signal</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peers.map((p) => (
                      <tr key={p.number}>
                        <td>
                          <Link href={`/company/${p.number}`} className="peer__name">
                            {p.name}
                          </Link>
                          <div className="peer__no mono">
                            {p.number}
                            {p.sicCode ? ` · SIC ${p.sicCode}` : ""}
                          </div>
                        </td>
                        <td className="mono">{p.incorporated ? fmtDate(p.incorporated) : "—"}</td>
                        <td>{p.region ?? "—"}</td>
                        <td>{p.signal}</td>
                        <td className="mono">{p.score}</td>
                      </tr>
                    ))}
                    {peers.length === 0 ? (
                      <tr className="empty-row">
                        <td colSpan={5}>No comparable companies found for this SIC code.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {peers.length >= 4 ? (
            <Card>
              <CardHeader subtitle="Where this company sits" title={`${lens.short} score distribution`} />
              <CardBody>
                <div className="hist-scroll">
                  <div className="hist">
                  {PEER_BUCKETS.map((b, i) => {
                    const n = distribution[i];
                    const max = Math.max(...distribution, 1);
                    return (
                      <div className={`hist__col${i === selfBucket ? " is-self" : ""}`} key={b}>
                        <span className="hist__bar" style={{ height: `${Math.max((n / max) * 100, 3)}%` }} />
                        <span className="hist__label mono">{i === selfBucket ? c.name.split(" ")[0] : b}</span>
                      </div>
                    );
                  })}
                  </div>
                </div>
                <p className="icard__note">
                  Distribution of the {peers.length} closest comparables we could score. Peers are scored on register
                  standing and trading history only — the full model needs each company&rsquo;s own filings, so treat
                  this as a position, not a ranking.
                </p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "records" ? (
        <div className="intel">
          <p className="tab-question">
            <Icon name="arrowRight" size={13} /> Answers: what is formally on the public register — and what has not been
            filed yet?
          </p>

          <div className="intel__row2">
            <Card>
              <CardHeader subtitle="Register record" title="Company details" />
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
                    <dd>{c.sicCodes.length ? c.classifications.map((cl) => `${cl.code} — ${cl.category}`).join("; ") : "—"}</dd>
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
                  <div>
                    <dt>Accounts</dt>
                    <dd className={c.accounts?.overdue ? "detail-overdue" : undefined}>{fmtDue(c.accounts)}</dd>
                  </div>
                  <div>
                    <dt>Confirmation statement</dt>
                    <dd className={c.confirmationStatement?.overdue ? "detail-overdue" : undefined}>
                      {fmtDue(c.confirmationStatement)}
                    </dd>
                  </div>
                </dl>
              </CardBody>
            </Card>

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
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              subtitle="Companies House"
              title="Filing history"
              action={
                filings.length ? (
                  <IconButton icon="download" variant="solid" label="Export filings" onClick={exportFilings} />
                ) : (
                  <Badge tone="neutral">No events</Badge>
                )
              }
            />
            <CardBody flush>
              <div className="table-scroll">
                <table className="data-table data-table--full">
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
                </table>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              subtitle="Secured lending"
              title="Charges &amp; mortgages"
              action={<Badge tone={charges.length ? "warn" : "neutral"}>{charges.length ? charges.length : "None"}</Badge>}
            />
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
                <div className="reg-empty">
                  <div className="reg-empty__title">No charges registered</div>
                  <div className="reg-empty__sub">
                    Nothing is secured against this company&rsquo;s assets on the Companies House register.
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}

      <p className="profile-disclaimer">
        CompaniesIQ presents evidence drawn from Companies House and ONS. Figures marked as modelled are derived from
        population and sector data. Scores are indicative, re-weight with the lens you choose, and are not financial,
        credit or legal advice.
      </p>
    </div>
  );
}
