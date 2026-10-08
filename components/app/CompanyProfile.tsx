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
import { GrowthBeacon } from "@/components/app/GrowthBeacon";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody, Tabs, tabButtonId, tabPanelId, StatusPill, Badge, Tag, CompanyAvatar, Icon, Button, InfoTip } from "@/components/ds";
import { FACT_TIPS, ROW_TIPS, DEFAULT_ROW_TIP } from "@/lib/glossary";
import { IntelligenceReport } from "@/components/app/IntelligenceReport";
import type { Company, Officer, Filing, Charge, PSC } from "@/lib/types";
import type { SectorTrend } from "@/lib/sector-trend";
import { QuarterBars } from "@/components/public/QuarterBars";
import { RecordsPanel } from "@/components/report/RecordsPanel";
import { FilingStatusCard } from "@/components/report/FilingStatusCard";
import { SummaryBar } from "@/components/report/SummaryBar";
import { ReportTour } from "@/components/report/ReportTour";
import type { IntelligenceReport as Report, SimilarCompany } from "@/lib/analytics";
import type { CompanyEnrichment } from "@/lib/enrichment/types";
import type { CompanyFinancials } from "@/lib/enrichment/financials-types";
import { FinancialsCard } from "@/components/app/FinancialsCard";
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
import { buildBrief, buildEvidence, buildActions, buildLensCard, relevantTo, weakestRow, ASKS, soWhat, keyFactNotes } from "@/lib/lens-view";
import { LensBar, useLensProfile } from "@/components/app/LensBar";
import { LensScoreCard, Fingerprint, type FingerprintCell } from "@/components/app/LensScore";
import { IntelGate } from "@/components/app/IntelGate";
import { METER_ALLOWANCE } from "@/lib/meter";

const DAY = 86_400_000;
const num = (n: number) => n.toLocaleString("en-GB");
const pc = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const toneClass = (t: Tone) => `is-${t}`;

type TabId = "intelligence" | "lens" | "market" | "competitors" | "records";
const TAB_IDS: TabId[] = ["intelligence", "lens", "market", "competitors", "records"];
const TAB_PREFIX = "report";
// One line under the tab bar saying what the open tab is for.
const TAB_HINT: Record<TabId, (audience: string) => string> = {
  intelligence: () => "The score, the reasons behind it, and what to do next.",
  lens: (a) => `Everything we checked for ${a}, signal by signal.`,
  market: () => "The industry and region around this company.",
  competitors: () => "Similar companies nearby, and where this one sits among them.",
  records: () => "The official record: filings, details, people and connections.",
};

// What the free account gets you, when the caller has nothing more specific.
const DEFAULT_GATE_WHAT =
  "The signals behind the score, this company's fingerprint against its sector peers, the market and competitive read, and what to do next";

/** A small "k / v" run used by the market, competitive and lens cards. */
function MiniRows({ rows, tips = false }: { rows: { k: string; v: string }[]; tips?: boolean }) {
  return (
    <div className="minirows">
      {rows.map((r) => (
        <div className="minirows__row" key={r.k}>
          <span className="minirows__k">
            {r.k}
            {tips ? <InfoTip title={r.k} body={ROW_TIPS[r.k] ?? DEFAULT_ROW_TIP} /> : null}
          </span>
          <span className="minirows__v mono">{r.v}</span>
        </div>
      ))}
    </div>
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
  filingLimit = null,
  metered = false,
  meterLeft = 0,
  financials = null,
  contactEntitled = false,
  contactRemaining = null,
  trend = null,
  tourSeen = null,
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
  /** How many filings to DISPLAY; null = the full history. Scoring always uses all of them. */
  filingLimit?: number | null;
  /** This logged-out visitor still has free reports left, so show it ungated. */
  metered?: boolean;
  meterLeft?: number;
  /** Figures from the latest filed accounts. Rendered inside the Intelligence
   *  tab rather than beneath the whole page — see the note at the call site. */
  financials?: CompanyFinancials | null;
  /** Does this reader's plan include verified contact discovery? */
  contactEntitled?: boolean;
  /** Contact lookups left this month; -1 = unlimited, null = not applicable. */
  contactRemaining?: number | null;
  /** Quarterly sector incorporations (Market tab); null omits the chart. */
  trend?: SectorTrend | null;
  /** profiles.report_tour_at for a signed-in reader; null = unknown. */
  tourSeen?: boolean | null;
}) {
  const c = company;
  const router = useRouter();
  const [tab, setTabState] = useState<TabId>("intelligence");
  // The open tab lives in the URL hash so a link can open the Records tab
  // directly. Read after mount only — the server HTML is the same for everyone.
  useEffect(() => {
    const h = window.location.hash.slice(1) as TabId;
    if (TAB_IDS.includes(h)) setTabState(h);
  }, []);
  const setTab = (t: TabId) => {
    setTabState(t);
    try {
      window.history.replaceState(null, "", t === "intelligence" ? window.location.pathname + window.location.search : `#${t}`);
    } catch {
      /* ignore */
    }
  };
  const panelProps = (id: TabId) => ({
    id: tabPanelId(TAB_PREFIX, id),
    role: "tabpanel" as const,
    "aria-labelledby": tabButtonId(TAB_PREFIX, id),
    hidden: tab !== id,
    tabIndex: 0,
    className: "report-panel",
  });

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
  const weakest = useMemo(() => weakestRow(score), [score]);
  const factNotes = useMemo(() => keyFactNotes(lensInput), [lensInput]);

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
  const hasFiledAccounts = !!c.accounts?.lastMadeUpTo || filings.some((f) => f.type === "AA");
  // Display only — every score and signal above still reads the full list.
  const shownFilings = filingLimit == null ? filings : filings.slice(0, filingLimit);
  const filingsTruncated = shownFilings.length < filings.length;

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

  // Two SIC codes often share a category — show each category once.
  const tags = [...new Set(c.classifications.map((cl) => cl.category))].slice(0, 3);

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
    // One mention of incorporation, not three — the header meta already
    // carries the date, so the prose adds only how long ago that was.
    (c.incorporated ? ` incorporated on ${fmtDate(c.incorporated)}${incDays != null ? ` (${agoText(incDays)})` : ""}` : "") +
    (place ? `, with its registered office in ${place}` : "") +
    "." +
    (summarySector ? ` The company operates in ${summarySector}.` : "");


  // The fingerprint indexes five fixed dimensions so the shape of a company is
  // comparable across lenses; only the last cell moves with the lens.
  const fingerprint: FingerprintCell[] = [
    {
      key: "financial",
      label: "Financial",
      value: hasFiledAccounts ? 62 : 22,
      trend: hasFiledAccounts ? "up" : "flat",
      state: hasFiledAccounts ? "Filed" : "No accounts yet",
      tone: hasFiledAccounts ? "good" : "watch",
    },
    {
      key: "growth",
      label: "Growth",
      value: Math.max(0, Math.min(100, Math.round(50 + report.industry.annualGrowth * 8))),
      trend: report.industry.annualGrowth >= 0 ? "up" : "down",
      state: report.industry.annualGrowth >= 1 ? "Positive" : report.industry.annualGrowth >= 0 ? "Flat" : "Negative",
      tone: report.industry.annualGrowth >= 1 ? "good" : report.industry.annualGrowth >= 0 ? "watch" : "risk",
    },
    {
      key: "market",
      label: "Market",
      value: Math.max(0, Math.min(100, Math.round(report.survival.fiveYear * 1.6 + 20))),
      trend: report.regional.regionalGrowth >= report.regional.nationalGrowth ? "up" : "down",
      state: report.regional.regionalGrowth >= report.regional.nationalGrowth ? "Attractive" : "Behind national",
      tone: report.regional.regionalGrowth >= report.regional.nationalGrowth ? "good" : "watch",
    },
    {
      key: "compliance",
      label: "Compliance",
      value: c.accounts?.overdue || c.confirmationStatement?.overdue ? 30 : 88,
      trend: c.accounts?.overdue || c.confirmationStatement?.overdue ? "down" : "up",
      state: c.accounts?.overdue || c.confirmationStatement?.overdue ? "Overdue" : "Clean",
      tone: c.accounts?.overdue || c.confirmationStatement?.overdue ? "risk" : "good",
    },
    {
      key: "competition",
      label: "Competition",
      value:
        report.local.density === "Very high" ? 92 : report.local.density === "High" ? 76 : report.local.density === "Moderate" ? 52 : 28,
      trend: "flat",
      state: report.local.density === "Very high" || report.local.density === "High" ? "Headwind" : "Manageable",
      tone: report.local.density === "Very high" || report.local.density === "High" ? "risk" : "good",
    },
  ];

  const sectorHref = c.primaryClassification?.sector ? `/industry/${slugify(c.primaryClassification.sector)}` : "/app/industries";
  const alertHref = signedIn ? "/app/alerts" : `/sign-in?next=${encodeURIComponent(`/company/${c.number}`)}`;

  // A step whose href is "#records" etc. switches tab instead of navigating.
  const tabFor = (href: string): TabId | null =>
    href === "#records" ? "records" : href === "#competitors" ? "competitors" : href === "#market" ? "market" : href === "#lens" ? "lens" : null;

  // The Intelligence tab below the score: the brief, the key facts, the
  // fingerprint and the next steps. Extracted so the gated and ungated views
  // render exactly the same tree — a gated view that quietly drops sections is
  // how the two drift apart.
  // Signed in, or spending a metered free read: show it. The gate is for the
  // visitor who has used their allowance.
  const openToReader = signedIn || metered;

  const evidenceBlock = (
    <>
      {/* An open reader gets the brief in the sticky "In short" bar. A gated
          reader gets one sentence there, and the full brief stays here behind
          the gate — still in the HTML, still crawlable. */}
      {openToReader ? null : (
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
      )}

      <div className="changed">
        <div className="changed__head">
          <span className="app-eyebrow">Key facts</span>
          <span className="changed__sub mono">Register &amp; sector</span>
        </div>
        <div className="changed__items">
          <div className="changed__item">
            <span className="changed__k mono">
              Industry growth
              <InfoTip {...FACT_TIPS.growth(report.local.region)} />
            </span>
            <span className={`changed__v ${report.industry.annualGrowth >= 0 ? "is-good" : "is-risk"}`}>
              {pc(report.industry.annualGrowth)}
            </span>
            <span className="changed__note">{factNotes.growth}</span>
          </div>
          <div className="changed__item">
            <span className="changed__k mono">
              Annual filing
              <InfoTip {...FACT_TIPS.filing} />
            </span>
            <span className={`changed__v ${c.confirmationStatement?.overdue ? "is-risk" : "is-good"}`}>
              {c.confirmationStatement?.overdue ? "Overdue" : "Current"}
            </span>
            <span className="changed__note">{factNotes.filing}</span>
          </div>
          <div className="changed__item">
            <span className="changed__k mono">
              {newlyIncorporated ? "Newly incorporated" : "Company age"}
              <InfoTip {...FACT_TIPS.age} />
            </span>
            <span className="changed__v">{incDays != null ? shortAge(incDays) : "—"}</span>
            <span className="changed__note">{factNotes.age}</span>
          </div>
          <div className="changed__item">
            <span className="changed__k mono">
              Local competition
              <InfoTip {...FACT_TIPS.competition} />
            </span>
            <span className="changed__v">{report.local.density}</span>
            <span className="changed__note">{factNotes.competition}</span>
          </div>
        </div>
      </div>

      <div data-tour="fingerprint">
        <Fingerprint cells={fingerprint} peers={report.local.inSameIndustry} lensKey={lensKey} lensScore={score} />
      </div>

      <Card data-tour="next">
        <CardBody>
          <div className="icard__head">
            <span className="app-eyebrow">What to do next</span>
            <Badge tone="neutral">For {lens.audience}</Badge>
          </div>
          <div className="nextcards">
            {actions.map((a, i) => {
              const t = tabFor(a.href);
              const body = (
                <>
                  <span className="nextcards__n mono">Step {i + 1}</span>
                  <span className="nextcards__main">
                    <span className="nextcards__title">{a.label}</span>
                    {a.why ? <span className="nextcards__why">{a.why}</span> : null}
                  </span>
                  <span className="nextcards__cta">
                    {a.cta} <Icon name="arrowRight" size={13} />
                  </span>
                </>
              );
              return t ? (
                <button type="button" className="nextcards__card" key={a.n} onClick={() => setTab(t)}>
                  {body}
                </button>
              ) : (
                <Link className="nextcards__card" href={a.href} key={a.n}>
                  {body}
                </Link>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </>
  );
  // One gate, used for the Intelligence tab's evidence and for whole tabs.
  // Signed in: render as-is. Anonymous: blur it, make it inert, and put the
  // free-account CTA over it.
  const gate = (node: React.ReactNode, what?: string) =>
    openToReader ? (
      node
    ) : (
      <IntelGate
        badge="Free account"
        title={`You've used your ${METER_ALLOWANCE} free reports this month`}
        sub={`A free account keeps this open: ${(what ?? DEFAULT_GATE_WHAT).charAt(0).toLowerCase()}${(what ?? DEFAULT_GATE_WHAT).slice(1)}. No card.`}
        ctaLabel="Create free account"
        ctaHref={`/sign-in?next=${encodeURIComponent(`/company/${c.number}`)}`}
        secondary={{ label: "See plans", href: "/pricing" }}
      >
        {node}
      </IntelGate>
    );

  return (
    <div className="screen profile">
      {/* A signed-in free reader on a locked report is the strongest upgrade
          signal we have — feed it to the Revenue Autopilot. */}
      {signedIn && !unlocked ? <GrowthBeacon event="paywall_view" refName="Company report" /> : null}
      {unlocked ? (
        <button className="back" onClick={() => router.push("/app/companies")}>
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
                <Button variant="secondary" iconLeft="user" onClick={() => router.push(`/visibility-review/${c.number}`)}>
                  Directors &amp; owners
                </Button>
              ) : null}
              <Button variant="primary" iconLeft="download" onClick={exportReport}>
                Export report
              </Button>
            </>
          ) : signedIn ? (
            // Signed in but not Pro: upgrade is the right next ask, and they
            // have already met the account gate.
            <Button href="/app/upgrade" variant="primary" iconRight="arrowRight">
              See plans
            </Button>
          ) : null}
        </div>
      </div>

      <p className="profile-summary">{summary}</p>

      {/* Tell them the meter exists. Hitting a gate on the fourth report with no
          warning reads as arbitrary; a visible count makes the ask expected. */}
      {metered ? (
        <div className="meter-note">
          <Icon name="shield" size={14} />
          <span>
            {meterLeft === 0 ? (
              <strong>This is your last free report this month.</strong>
            ) : (
              <>
                <strong>
                  {meterLeft} more free {meterLeft === 1 ? "report" : "reports"}
                </strong>{" "}
                this month.
              </>
            )}{" "}
            <Link href={`/sign-in?next=${encodeURIComponent(`/company/${c.number}`)}`}>
              Create a free account
            </Link>{" "}
            to keep reading without a limit.
          </span>
        </div>
      ) : null}

      <ReportTour signedIn={signedIn} seenOnServer={tourSeen} audience={lens.audience} onBeforeStart={() => setTab("intelligence")} />

      <div data-tour="lens">
      <LensBar
        profileKey={profileKey}
        otherText={otherText}
        onChoose={choose}
        savedDefault={savedLens}
        canSave={unlocked}
        signedIn={signedIn}
      />
      </div>

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

      <SummaryBar
        brief={brief}
        audience={lens.audience}
        locked={!openToReader}
        unlockHref={`/sign-in?next=${encodeURIComponent(`/company/${c.number}`)}`}
        onViewEvidence={() => {
          setTab("lens");
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          document.getElementById(tabPanelId(TAB_PREFIX, "lens"))?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        }}
      >
      <div className="profile-tabs profile-tabs--lens">
        <Tabs
          value={tab}
          onChange={(id) => setTab(id as TabId)}
          idPrefix={TAB_PREFIX}
          ariaLabel="Report sections"
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
      </SummaryBar>
      <p className="tab-hint">{TAB_HINT[tab](lens.audience)}</p>

      {/* Every panel is in the server HTML; inactive ones are `hidden`, not
          unmounted, so crawlers and no-JS readers get all five. */}
      <section {...panelProps("intelligence")}>
        <div className="intel">
          {/* The one thing that stays open to everyone, Googlebot included:
              the score. It is the hook, and on its own it is not the product —
              everything else on this tab sits behind the free-account gate. */}
          <div data-tour="score">
            <LensScoreCard
              score={score}
              weakest={weakest}
              asks={ASKS[lensKey]}
              sources={enrichment ? "Companies House · ONS · Nomis · Google Places" : "Companies House · ONS · Nomis"}
            />
          </div>

          {/* Turnover, net worth and the growth tier sit directly under the
              score — the most decision-relevant card for almost every reader. */}
          {financials ? (
            <div className="intel__solo">
              <FinancialsCard financials={financials} company={c.name} />
            </div>
          ) : null}

          {gate(evidenceBlock)}

          {unlocked ? (
            <IntelligenceReport
              report={report}
              enrichment={enrichment}
              opportunity={opportunity}
              contactEntitled={contactEntitled}
              contactRemaining={contactRemaining}
              prospect={{
                number: c.number,
                name: c.name,
                sector: c.primaryClassification?.sector ?? null,
                region: c.geo?.region ?? null,
                score: score.score,
              }}
            />
          ) : signedIn ? (
            /* The third rung. An anonymous visitor has already met the
               free-account gate, so an upgrade pitch here would be a second ask
               before they have seen anything. */
            <Card className="deepgate">
              <CardBody>
                <Badge tone="accent" dot>
                  Deep intelligence · Pro
                </Badge>
                <h2 className="deepgate__title">Unlock the full report</h2>
                <p className="deepgate__sub">
                  Verified digital presence, director networks, keyword and regional intelligence, CSV exports, alerts
                  and watchlists across every UK company. Everything above stays on your free account.
                </p>
                <div className="deepgate__cta">
                  <Link href="/app/upgrade">
                    <Button variant="primary" iconRight="arrowRight">
                      See plans
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </section>

      <section {...panelProps("lens")}>
        {gate(
          <div className="intel">
            <p className="tab-question">
              <Icon name="arrowRight" size={13} /> Answers: {lens.question}
            </p>
            <div className="intel__row2">
              <Card>
                <CardBody>
                  <div className="icard__head">
                    <span className="app-eyebrow">{lensCard.label}</span>
                    <Badge tone={lensCard.flagTone === "good" ? "pos" : lensCard.flagTone === "risk" ? "warn" : "neutral"}>
                      {lensCard.flag}
                    </Badge>
                  </div>
                  <div className="icard__headline">{lensCard.headline}</div>
                  <MiniRows rows={lensCard.rows} tips />
                  <p className="icard__note">{lensCard.note}</p>
                  <div className="icard__foot">
                    <span />
                    <span className="icard__src mono">{lensCard.source}</span>
                  </div>
                </CardBody>
              </Card>
              <FilingStatusCard
                company={c}
                hasFiledAccounts={hasFiledAccounts}
                alertHref={alertHref}
                soWhat={soWhat(lensKey, {
                  late:
                    !!c.accounts?.overdue ||
                    !!c.confirmationStatement?.overdue ||
                    (!!c.accounts?.nextDue && Date.parse(c.accounts.nextDue) < Date.now()),
                  filed: hasFiledAccounts,
                })}
              />
            </div>

            <Card>
              <CardHeader
                subtitle={lens.tabTitle}
                title={`What we checked · ${lens.label} weighting`}
                action={<Badge tone="neutral">{score.coverage}% measurable</Badge>}
              />
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
              <CardHeader subtitle="Commonly relevant to" title={`What ${lens.audience} usually offer a company like this`} />
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
          </div>,
          "What is actually evidenced for the lens you picked, row by row, and which signals could not be checked"
        )}
      </section>

      <section {...panelProps("market")}>
        {gate(
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
                    <span className="bigstat__k mono">National growth</span>
                    <span className="bigstat__v">{pc(report.regional.nationalGrowth)}</span>
                  </div>
                  <div className="bigstat">
                    <span className="bigstat__k mono">{report.local.region}</span>
                    <span className="bigstat__v">{pc(report.regional.regionalGrowth)}</span>
                  </div>
                  <div className="bigstat">
                    <span className="bigstat__k mono">New registrations (12m)</span>
                    <span className="bigstat__v">{num(report.industry.newLastYear)}</span>
                  </div>
                  <div className="bigstat">
                    <span className="bigstat__k mono">5-year survival</span>
                    <span className="bigstat__v">{report.survival.fiveYear.toFixed(1)}%</span>
                  </div>
                </div>
                <p className="icard__note">{report.regional.insight}</p>
                {trend && trend.points.length ? (
                  <div className="mkt-trend">
                    <div className="mkt-trend__head mono">New companies per quarter</div>
                    <QuarterBars
                      points={trend.points}
                      label={`New ${report.industry.sector.toLowerCase()} companies per quarter, last ${trend.points.length} quarters`}
                    />
                    {/* Companies House filters on explicit SIC codes only, so
                        say what is counted rather than implying a sector total. */}
                    <p className="icard__src mono">
                      Companies House · incorporations across {trend.codeCount} tracked SIC code{trend.codeCount === 1 ? "" : "s"} in
                      this sector
                    </p>
                  </div>
                ) : null}
              </CardBody>
            </Card>

            <div className="intel__row2">
              <Card>
                <CardHeader subtitle="Growth &amp; survival" title="How long companies last here" />
                <CardBody>
                  <div className="survival">
                    {(
                      [
                        ["1-year survival", report.survival.oneYear],
                        ["3-year survival", report.survival.threeYear],
                        ["5-year survival", report.survival.fiveYear],
                      ] as [string, number][]
                    ).map(([k, v]) => (
                      <div className="survival__row" key={k}>
                        <span className="survival__k">{k}</span>
                        <span className="survival__bar" aria-hidden="true">
                          <span style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
                        </span>
                        <span className="survival__v mono">{v.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="icard__note">
                    Of every 100 companies started in this sector, roughly {Math.round(report.survival.fiveYear)} are still
                    trading five years later.
                    {incDays != null && incDays > 5 * 365.25 ? " This company is past that point." : ""}
                  </p>
                  <div className="icard__foot">
                    <Link className="icard__cta" href="/sources">
                      View methodology <Icon name="arrowRight" size={13} />
                    </Link>
                    <span className="icard__src mono">{report.survival.source} · sector baseline, not this company</span>
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

            <Card>
              <CardHeader subtitle="Trends &amp; outlook" title="Where the sector is heading" />
              <CardBody>
                <MiniRows
                  rows={[
                    { k: "Growth trajectory", v: report.trends.trajectory },
                    { k: "Regional concentration", v: report.trends.concentration },
                    { k: "Emerging locations", v: report.trends.emerging },
                    { k: "Sector momentum", v: report.trends.momentum },
                  ]}
                />
                {report.outlook.items.length ? (
                  <ul className="recs" style={{ marginTop: 16 }}>
                    {report.outlook.items.map((item, i) => (
                      <li key={i}>
                        <span className="recs__num mono">{i + 1}</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="icard__foot">
                  <Link className="icard__cta" href="/sources">
                    View methodology <Icon name="arrowRight" size={13} />
                  </Link>
                  <span className="icard__src mono">{report.trends.source}</span>
                </div>
              </CardBody>
            </Card>
          </div>,
          "How big this market is, how fast it is growing, how many companies survive five years, the local economy around it, and where the sector is heading"
        )}
      </section>

      <section {...panelProps("competitors")}>
        {gate(
          <div className="intel">
            <p className="tab-question">
              <Icon name="arrowRight" size={13} /> Answers: how crowded is this market, and where does this company sit
              against its peers?
            </p>
            {peers.length >= 4 ? (
              <Card>
                <CardHeader
                  subtitle={`Where this company sits · ${lens.short} score for ${lens.audience}`}
                  title="Score distribution"
                  action={<Badge tone="neutral">{peers.length} closest comparables</Badge>}
                />
                <CardBody>
                  {/* Scrolls sideways on a phone, so it must be reachable by keyboard. */}
                  <div className="hist-scroll" tabIndex={0} role="region" aria-label="Score distribution chart">
                    <div className="hist" role="img" aria-label={`${c.name} scores ${score.score}, in the ${PEER_BUCKETS[selfBucket]} band of ${peers.length} comparables`}>
                      {PEER_BUCKETS.map((b, i) => {
                        const n = distribution[i];
                        const max = Math.max(...distribution, 1);
                        return (
                          <div className={`hist__col${i === selfBucket ? " is-self" : ""}`} key={b}>
                            <span className="hist__n mono">{i === selfBucket ? "This one" : n}</span>
                            <span className="hist__bar" style={{ height: `${Math.max((n / max) * 100, 3)}%` }} />
                            <span className="hist__label mono">{b}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <p className="icard__note">
                    Peers are scored on register standing and trading history only — the full model needs each
                    company&rsquo;s own filings, so treat this as a position, not a ranking.
                  </p>
                </CardBody>
              </Card>
            ) : null}

            <Card>
              <CardHeader
                subtitle={`Closest comparables · ${num(report.local.inSameIndustry)} in ${report.local.region} · ${num(report.local.newEntrants)} new in 12m`}
                title="Peer companies"
                action={
                  <Link className="icard__cta" href={sectorHref}>
                    Build a list from these <Icon name="arrowRight" size={13} />
                  </Link>
                }
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
          </div>,
          "The closest comparable companies on the register and where this one sits in the distribution"
        )}
      </section>

      <section {...panelProps("records")}>
        {gate(
          <div className="intel">
            <p className="tab-question">
              <Icon name="arrowRight" size={13} /> Answers: what is formally on the public register — and what has not been
              filed yet?
            </p>
            <RecordsPanel
              company={c}
              officers={officers}
              filings={filings}
              shownFilings={shownFilings}
              charges={charges}
              pscs={pscs}
              network={network}
              unlocked={unlocked}
              signedIn={signedIn}
              hasFiledAccounts={hasFiledAccounts}
              onExportFilings={exportFilings}
            />
          </div>,
          "The formal register record: a filing timeline, company details, directors, persons with significant control, charges and connected companies"
        )}
      </section>
      <p className="profile-disclaimer">
        CompaniesIQ presents evidence drawn from Companies House and ONS. Figures marked as modelled are derived from
        population and sector data. Scores are indicative, re-weight with the lens you choose, and are not financial,
        credit or legal advice.
      </p>
    </div>
  );
}
