import Link from "next/link";
import { Badge, Icon, Card, CardBody, StatusPill, CompanyAvatar, Tag, Button, type IconName } from "@/components/ds";
import { SiteFooter } from "@/components/marketing/Footer";
import { HeroSearch } from "@/components/marketing/HeroSearch";
import { fmtNumber, fmtDelta } from "@/lib/format";
import { getRegisterKpis, getQuickInsights } from "@/lib/live-stats";
import { slugify } from "@/lib/slug";
import { SITE_DESCRIPTION } from "@/lib/site";

export const metadata = {
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export const revalidate = 3600;

function PreviewRow({ name, no, status, sic, rev }: { name: string; no: string; status: string; sic: string; rev: string }) {
  return (
    <Link href={`/company/${no}`} className="pv-row" style={{ textDecoration: "none" }}>
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
  { icon: "bell", title: "New companies, the day they appear", body: "Every UK incorporation, classified and searchable within 24 hours of hitting the register — be first to the businesses that matter." },
  { icon: "search", title: "Search that understands business", body: "Filter 5.5M companies by sector, region, size, age and status in plain language — not SIC-code soup." },
  { icon: "barChart", title: "Markets, not just records", body: "Roll millions of filings into sector, regional and city trends to size a market or spot what's forming." },
  { icon: "building", title: "Every company, in full", body: "Officers, PSCs, charges, accounts and a 10-year filing history — assembled into one readable report." },
  { icon: "trendUp", title: "Signals worth acting on", body: "Track a watchlist and get told the moment a company forms, files, appoints, dissolves or raises a charge." },
  { icon: "download", title: "Yours to take with you", body: "Export any search, report or list to CSV — every figure sourced from the public register and dated." },
];

const STEPS: [string, string, string][] = [
  ["01", "Search", "Start with a sector, a region, or a fresh batch of new incorporations. Narrow with filters until the set is exactly right."],
  ["02", "Track", "Save the companies and markets that matter to a watchlist and let CompaniesIQ watch the register for you."],
  ["03", "Act", "Get alerted to every new formation and change, export the evidence, and reach them before the market does."],
];

const USE_CASES: [IconName, string, string][] = [
  ["briefcase", "Agencies", "Find newly registered businesses and pitch them before competitors even know they exist."],
  ["trendUp", "Investors", "Track emerging sectors and regional growth as it forms — not months later."],
  ["users", "Recruiters", "Spot fast-growing employers the moment they scale and start hiring."],
  ["file", "Accountants", "Reach newly incorporated companies that need accounting and compliance support."],
  ["barChart", "Consultants & analysts", "Monitor market-formation activity across every UK sector, region and city."],
];

export default async function LandingPage() {
  const [kpis, insights] = await Promise.all([
    getRegisterKpis(30).catch(() => null),
    getQuickInsights(30).catch(() => null),
  ]);
  const incGrowth =
    kpis && kpis.prevIncorporations > 0 ? ((kpis.incorporations - kpis.prevIncorporations) / kpis.prevIncorporations) * 100 : null;

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
            Spot new business opportunities
            <br />
            <em>the day they appear</em>.
          </h1>
          <p className="hero__sub">
            The UK company &amp; market intelligence platform built on Companies House — find newly registered
            businesses, growing sectors and new-company alerts before your competitors.
          </p>
          <HeroSearch />
          <div className="hero__trust">
            <span className="mono">No card required</span>
            <span className="dot">·</span>
            <span className="mono">{kpis ? `${fmtNumber(kpis.active)} live companies` : "5.5M live companies"}</span>
            <span className="dot">·</span>
            <span className="mono">Updated within 24h</span>
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

      {/* Live register intelligence */}
      <section className="live-band" id="data">
        <div className="live-band__head">
          <span className="eyebrow">Live on the UK register · last 30 days</span>
          <Badge tone="pos" dot>
            Live from Companies House
          </Badge>
        </div>
        <div className="live-grid">
          <div className="live-stat">
            <div className="live-stat__label mono">New companies</div>
            <div className="live-stat__value">{kpis ? fmtNumber(kpis.incorporations) : "—"}</div>
            <div className="live-stat__sub">
              {incGrowth != null ? `${fmtDelta(incGrowth)} vs prior 30 days` : "incorporated this period"}
            </div>
          </div>
          <Link className="live-stat live-stat--link" href={insights ? `/industry/${slugify(insights.fastestSector.name)}` : "/industry"}>
            <div className="live-stat__label mono">Fastest-growing sector</div>
            <div className="live-stat__value">{insights ? insights.fastestSector.name : "—"}</div>
            <div className="live-stat__sub">{insights ? `${fmtDelta(insights.fastestSector.growth)} annual growth →` : "explore industries →"}</div>
          </Link>
          <Link className="live-stat live-stat--link" href={insights ? `/market/${slugify(insights.fastestRegion.name)}` : "/market"}>
            <div className="live-stat__label mono">Fastest-growing region</div>
            <div className="live-stat__value">{insights ? insights.fastestRegion.name : "—"}</div>
            <div className="live-stat__sub">{insights ? `${insights.fastestRegion.index.toFixed(2)}× index →` : "explore markets →"}</div>
          </Link>
          <div className="live-stat">
            <div className="live-stat__label mono">Most active activity</div>
            <div className="live-stat__value">{insights?.topSic ? insights.topSic.label : "—"}</div>
            <div className="live-stat__sub">{insights?.topSic ? `SIC ${insights.topSic.key}` : "by new registrations"}</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section">
        <div className="section__head">
          <span className="eyebrow">What you get</span>
          <h2 className="section__title">New-formation intelligence, not just a search box.</h2>
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
          <h2 className="section__title">From the register to a decision, in three steps.</h2>
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
          <h2 className="section__title">Built for whoever needs to move first.</h2>
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

      {/* Pricing teaser */}
      <section className="section section--alt">
        <div className="section__head">
          <span className="eyebrow">Pricing</span>
          <h2 className="section__title">Start free. Upgrade when you&apos;re moving fast.</h2>
        </div>
        <div className="price-teaser">
          <div className="price-teaser__card">
            <div className="price-teaser__name">Free</div>
            <div className="price-teaser__price">£0</div>
            <ul className="price-teaser__list">
              <li><Icon name="check" size={15} color="var(--accent)" /> Search 5.5M companies</li>
              <li><Icon name="check" size={15} color="var(--accent)" /> Public company profiles</li>
              <li><Icon name="check" size={15} color="var(--accent)" /> 1 full intelligence report / month</li>
              <li><Icon name="check" size={15} color="var(--accent)" /> Industry, market &amp; signal pages</li>
            </ul>
          </div>
          <div className="price-teaser__card price-teaser__card--pro">
            <div className="price-teaser__flag"><Badge tone="accent">Most popular</Badge></div>
            <div className="price-teaser__name">Pro</div>
            <div className="price-teaser__price">from £39<span className="price-teaser__per mono">/mo</span></div>
            <ul className="price-teaser__list">
              <li><Icon name="check" size={15} color="var(--accent)" /> Unlimited intelligence reports</li>
              <li><Icon name="check" size={15} color="var(--accent)" /> Real-time formation &amp; filing alerts</li>
              <li><Icon name="check" size={15} color="var(--accent)" /> Watchlists &amp; saved searches</li>
              <li><Icon name="check" size={15} color="var(--accent)" /> CSV export &amp; API</li>
            </ul>
          </div>
        </div>
        <div className="price-teaser__cta">
          <Link href="/pricing">
            <Button variant="secondary" iconRight="arrowRight">
              See full pricing
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="cta ciq-dark">
        <div className="cta__inner">
          <h2 className="cta__title">See new UK businesses before everyone else.</h2>
          <p className="cta__sub">Free to search. No card required. Upgrade when you&apos;re ready to track, alert and export.</p>
          <div className="cta__actions">
            <Link href="/sign-in">
              <Button variant="primary" size="lg" iconRight="arrowRight">
                Start free
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
