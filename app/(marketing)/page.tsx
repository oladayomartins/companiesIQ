import Link from "next/link";
import { Badge, Icon, Stat, Card, CardBody, StatusPill, CompanyAvatar, Tag, Button, type IconName } from "@/components/ds";
import { SiteFooter } from "@/components/marketing/Footer";
import { HeroSearch } from "@/components/marketing/HeroSearch";
import { fmtNumber } from "@/lib/format";
import { countCompanies } from "@/lib/companies-house";

export const revalidate = 3600;

async function liveActiveCount(): Promise<number | null> {
  try {
    return await countCompanies({ status: ["active"] });
  } catch {
    return null;
  }
}

function PreviewRow({ name, no, status, sic, rev }: { name: string; no: string; status: string; sic: string; rev: string }) {
  return (
    <Link href={`/app/company/${no}`} className="pv-row" style={{ textDecoration: "none" }}>
      <div className="pv-co">
        <CompanyAvatar name={name} size="sm" />
        <div>
          <div className="pv-co__name">{name}</div>
          <div className="pv-co__no">{no}</div>
        </div>
      </div>
      <StatusPill status={status} />
      <span className="pv-sic">{sic}</span>
      <span className="pv-rev">{rev}</span>
    </Link>
  );
}

function Feature({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div className="feat">
      <span className="feat__icon">
        <Icon name={icon} size={20} />
      </span>
      <h3 className="feat__title">{title}</h3>
      <p className="feat__body">{body}</p>
    </div>
  );
}

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: "search", title: "Search that understands business", body: "Filter 5.3M companies by sector, region, size, age, status and filing signal — in plain language, not SIC-code soup." },
  { icon: "building", title: "Every company, in full", body: "Officers, PSCs, charges, accounts and a 10-year filing history — assembled into one readable profile." },
  { icon: "bell", title: "Signals when it matters", body: "Track a watchlist and get told the moment a company files, appoints, dissolves or raises a charge." },
  { icon: "barChart", title: "Markets, not just records", body: "Roll millions of filings up into sector and regional trends to size a market or spot what's moving." },
  { icon: "download", title: "Yours to take with you", body: "Export any search, profile or list to CSV — or pull it straight into your stack via the API." },
  { icon: "shield", title: "Sourced & auditable", body: "Every figure is drawn from the public register and dated, so you can always show your working." },
];

const STEPS: [string, string, string][] = [
  ["01", "Search", "Start with a sector, a region, or a single company. Narrow with filters until the set is exactly right."],
  ["02", "Track", "Save the companies that matter to a watchlist and let CompaniesIQ watch the register for you."],
  ["03", "Act", "Get a daily digest of every change, export the evidence, and move before the market does."],
];

const USE_CASES: [IconName, string, string][] = [
  ["briefcase", "Dealmakers & corporate finance", "Source targets, map ownership, and diligence a counterparty before the first call."],
  ["users", "Sales & B2B marketing", "Build territory lists of real, active companies and reach them while they're growing."],
  ["shield", "Risk, compliance & credit", "Screen counterparties, monitor charges and catch a status change the day it files."],
];

export default async function LandingPage() {
  const activeCount = await liveActiveCount();
  return (
    <main className="site">
      {/* Hero */}
      <section className="hero" id="product">
        <div className="hero__copy">
          <div className="hero__eyebrow">
            <Badge tone="accent" dot>
              Updated daily from Companies House
            </Badge>
          </div>
          <h1 className="hero__title">
            Know every company,
            <br />
            before they know <em>you</em>.
          </h1>
          <p className="hero__sub">
            CompaniesIQ turns the UK&apos;s public business register into market intelligence you can search, track and
            trust — 5.3 million live companies, one source of truth.
          </p>
          <HeroSearch />
          <div className="hero__trust">
            <span className="mono">No card required</span>
            <span className="dot">·</span>
            <span className="mono">5.3M companies</span>
            <span className="dot">·</span>
            <span className="mono">10-year filing history</span>
          </div>
        </div>

        <div className="hero__preview">
          <div className="pv-frame">
            <div className="pv-bar">
              <span className="pv-dot" />
              <span className="pv-dot" />
              <span className="pv-dot" />
              <span className="pv-url mono">app.companiesiq.co.uk/search</span>
            </div>
            <div className="pv-body ciq-dark">
              <div className="pv-chips">
                <Tag active>Fintech</Tag>
                <Tag>London</Tag>
                <Tag>Active</Tag>
              </div>
              <PreviewRow name="Monzo Bank Limited" no="09446231" status="active" sic="64205" rev="£880.0m" />
              <PreviewRow name="Revolut Ltd" no="08804411" status="active" sic="64205" rev="£1.8bn" />
              <PreviewRow name="Starling Bank Limited" no="09092149" status="active" sic="64205" rev="£682.2m" />
              <PreviewRow name="Wise PLC" no="07209813" status="active" sic="66190" rev="£1.05bn" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust band */}
      <section className="band" id="data">
        <div className="band__inner">
          <Stat label="Live UK companies" value={activeCount ? fmtNumber(activeCount) : "5.5M+"} size="lg" />
          <Stat label="Filings tracked" value="214M" size="lg" />
          <Stat label="Updated" value="Daily" size="lg" />
          <Stat label="Signal latency" value={"< 24h"} size="lg" />
        </div>
      </section>

      {/* Features */}
      <section className="section">
        <div className="section__head">
          <span className="eyebrow">What you get</span>
          <h2 className="section__title">The register, made legible.</h2>
        </div>
        <div className="feat-grid">
          {FEATURES.map((f) => (
            <Feature key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="section section--alt">
        <div className="section__head">
          <span className="eyebrow">How it works</span>
          <h2 className="section__title">From public data to a decision, in three steps.</h2>
        </div>
        <div className="steps">
          {STEPS.map(([n, t, b]) => (
            <div className="step" key={n}>
              <span className="step__n mono">{n}</span>
              <h3 className="step__t">{t}</h3>
              <p className="step__b">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="section" id="about">
        <div className="section__head">
          <span className="eyebrow">Who uses it</span>
          <h2 className="section__title">Built for teams who live in the register.</h2>
        </div>
        <div className="use-grid">
          {USE_CASES.map(([i, t, b]) => (
            <Card key={t} variant="flat">
              <CardBody>
                <span className="feat__icon">
                  <Icon name={i} size={20} />
                </span>
                <h3 className="feat__title">{t}</h3>
                <p className="feat__body">{b}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta ciq-dark">
        <div className="cta__inner">
          <h2 className="cta__title">Start reading the register today.</h2>
          <p className="cta__sub">Free to search. No card required. Upgrade when you&apos;re ready to track and export.</p>
          <div className="cta__actions">
            <Link href="/app">
              <Button variant="primary" size="lg" iconRight="arrowRight">
                Get started free
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="lg">
                See pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
