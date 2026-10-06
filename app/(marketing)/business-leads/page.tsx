import Link from "next/link";
import type { Metadata } from "next";
import { Badge, Button, Icon, type IconName } from "@/components/ds";
import { SiteFooter } from "@/components/marketing/Footer";
import { JsonLd } from "@/components/JsonLd";
import { fmtNumber } from "@/lib/format";
import { getRegisterKpis } from "@/lib/live-stats";
import { breadcrumbLd, webPageLd, faqLd } from "@/lib/seo-schema";
import { SITE_URL } from "@/lib/site";
import { slugify } from "@/lib/slug";
import { getMarketSummary } from "@/lib/market-summary";
import { LeadListBuilder } from "@/components/marketing/LeadListBuilder";
import { FreeAlertForm } from "@/components/FreeAlertForm";

export const revalidate = 3600;

const PATH = "/business-leads";

export const metadata: Metadata = {
  // ~60 chars incl. brand; matches "business leads", "uk business leads", "b2b leads".
  title: { absolute: "UK Business Leads: Free B2B Prospect Lists · CompaniesIQ" },
  description:
    "Build UK business leads from the live Companies House register: pick an industry and town, see every new and active company, and export a B2B prospect list. Free to search.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "CompaniesIQ — UK business leads & B2B prospect lists",
    description:
      "Turn the Companies House register into a B2B lead database: filter new companies by sector and location, enrich and export targeted prospect lists.",
    url: `${SITE_URL}${PATH}`,
    type: "website",
  },
};

const STEPS: [string, string, string][] = [
  ["01", "Filter the register", "Start from 5.5M companies and narrow by sector, region, city, company size, age and status — or start from this week's new incorporations — until the set matches your ideal customer."],
  ["02", "Enrich the list", "Each company comes with its officers, registered office, activity and, where filed, accounts signals — so you're prospecting businesses that fit, not guessing."],
  ["03", "Export & reach out", "Export the targeted list to CSV or push it through the API into your CRM, then reach out before competitors even know the companies exist."],
];

// Each audience links to its own use-case guide — the page used to describe
// them and link nowhere.
const AUDIENCES: { icon: IconName; who: string; body: string; href: string; cta: string }[] = [
  { icon: "file", who: "Accountants & bookkeepers", body: "Newly incorporated companies that need accounting, tax and compliance support — reach them in their first weeks.", href: "/use-cases/accountants", cta: "Accountancy leads" },
  { icon: "users", who: "Recruiters", body: "Fast-growing and newly formed employers about to hire — get in before the vacancy is even posted.", href: "/use-cases/recruiters", cta: "Recruitment leads" },
  { icon: "briefcase", who: "Marketing & web agencies", body: "New businesses that need a website, branding and marketing — the moment they incorporate is the moment to pitch.", href: "/use-cases/marketing-agencies", cta: "Agency leads" },
  { icon: "shield", who: "Commercial insurance brokers", body: "Every new company needs business insurance — employers' liability, public liability, cover for premises and vehicles. Reach them before renewal is someone else's.", href: "/use-cases/insurance-brokers", cta: "Business insurance leads" },
  { icon: "building", who: "B2B sales teams", body: "Target accounts by sector, size and location, build the list, and hand sales a clean, exportable set of prospects.", href: "/use-cases/sales-teams", cta: "Sales prospecting" },
  { icon: "globe", who: "Commercial property & services", body: "Growing and relocating companies that need office space, IT, telecoms and professional services.", href: "/company-database", cta: "UK company database" },
];

// Sectors shown with live register counts (UK-wide). Bounded so the page costs a
// fixed handful of cached Companies House calls (getMarketSummary, 6h cache).
const LEAD_SECTORS = ["Construction", "Technology", "Professional services", "Hospitality", "Real estate", "Retail & wholesale"];
const LEAD_CITIES = ["London", "Manchester", "Birmingham"];

const FAQS: [string, string][] = [
  [
    "How do I find B2B leads in the UK?",
    "One of the strongest sources is the Companies House register: every UK company, its activity, location and officers, updated as new businesses incorporate. CompaniesIQ lets you filter that register by sector, region, size, age and status to build a targeted prospect list, enrich it, and export it — so you find leads that match your ideal customer rather than buying a stale list.",
  ],
  [
    "What makes these leads better than a bought list?",
    "They're fresh, targeted and sourced. Purchased lists are often out of date and generic. Here, every lead is a real, current company from the live register, filtered to your criteria and dated — including businesses that only incorporated this week, which no static list will have yet.",
  ],
  [
    "Can I get leads for newly registered companies?",
    "Yes — that's a core use case. New incorporations are classified and searchable within 24 hours, so you can build a list of companies formed today, this week or this month, filtered by sector and location. Timing matters: reaching a company in its first weeks beats reaching it months later.",
  ],
  [
    "Can I filter leads by industry and location?",
    "Yes. Combine SIC sector, UK region and city filters — for example new construction companies in Manchester, or marketing agencies in London — with size, age and status. Every filtered view is a prospect list you can export.",
  ],
  [
    "Can I export leads to my CRM?",
    "Yes. Any list exports to CSV, and Team and Enterprise include API access to pull companies straight into your CRM, spreadsheet or sales tool. Every field is sourced from the public register and dated.",
  ],
  [
    "Is it legal to use Companies House data for lead generation?",
    "Companies House data is public record, reused under the Open Government Licence, and using it to identify businesses to approach is a common and legitimate use. You remain responsible for how you contact companies — UK marketing rules (such as PECR and GDPR) still apply to your outreach, particularly for electronic marketing.",
  ],
  [
    "Is there a free plan?",
    "Yes. You can search the whole register and view companies for free, with no card required. Upgrade to build, save and export larger prospect lists and to add enrichment and API access — see the pricing page.",
  ],
];

export default async function BusinessLeadsPage() {
  const [kpis, sectors] = await Promise.all([
    getRegisterKpis(30).catch(() => null),
    Promise.all(LEAD_SECTORS.map(async (sector) => ({ sector, m: await getMarketSummary({ sector }) }))),
  ]);
  const delta =
    kpis && kpis.prevIncorporations > 0
      ? ((kpis.incorporations - kpis.prevIncorporations) / kpis.prevIncorporations) * 100
      : null;

  return (
    <main className="site" id="main-content" tabIndex={-1}>
      <JsonLd
        data={[
          webPageLd({
            name: "UK Business Leads — CompaniesIQ",
            path: PATH,
            description:
              "Build fresh UK B2B leads from Companies House: filter newly registered companies by industry, location, size and age, enrich them, and export a targeted prospect list.",
          }),
          breadcrumbLd([
            ["Home", "/"],
            ["UK business leads", PATH],
          ]),
          faqLd(FAQS),
        ]}
      />

      <section className="pricing-hero">
        <span className="eyebrow">UK business leads</span>
        <h1 className="pricing-hero__title">Fresh B2B leads, straight from the register.</h1>
        <p className="pricing-hero__sub">
          Every week thousands of new UK companies incorporate. Filter them by industry, location, size and age, enrich
          the list, and export a targeted set of prospects — reaching businesses that fit your offer before your
          competitors find them.
        </p>
        <div className="bill-toggle" style={{ gap: 10, flexWrap: "wrap" }}>
          {kpis ? (
            <Badge tone="pos" dot>
              {fmtNumber(kpis.incorporations)} new companies in 30 days
            </Badge>
          ) : (
            <Badge tone="pos" dot>Thousands of new companies weekly</Badge>
          )}
          {delta !== null ? (
            <Badge tone={delta >= 0 ? "pos" : "neutral"}>
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}% vs previous 30 days
            </Badge>
          ) : null}
          <Badge tone="neutral">Filter by sector &amp; location</Badge>
          <Badge tone="neutral">Export to CSV</Badge>
        </div>
        <div className="hero__actions" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 26 }}>
          <Button href="#build" variant="primary" size="lg" iconRight="arrowRight">
            Build a lead list — free
          </Button>
          <Button href="#weekly" variant="secondary" size="lg">
            Get new leads weekly
          </Button>
        </div>
      </section>

      <section className="section" id="build">
        <div className="section__head">
          <span className="eyebrow">Build a lead list</span>
          <h2 className="section__title">Pick an industry and a town. See every company.</h2>
        </div>
        <LeadListBuilder />
        <p className="lead-builder__note mono">
          Live from Companies House · free to search, no card · upgrade to save, track and export the full list
        </p>
      </section>

      <section className="section section--alt">
        <div className="section__head">
          <span className="eyebrow">Live on the register</span>
          <h2 className="section__title">New business leads this month, by industry.</h2>
        </div>
        <div className="lead-sectors">
          {sectors.map(({ sector, m }) => (
            <div className="lead-sector" key={sector}>
              <h3 className="lead-sector__name">{sector}</h3>
              {m ? (
                <p className="lead-sector__stats">
                  <strong>{fmtNumber(m.new30)}</strong> new in the last 30 days
                  <span className="lead-sector__sub mono">{fmtNumber(m.active)} active UK companies</span>
                </p>
              ) : (
                <p className="lead-sector__stats muted">Live counts unavailable right now</p>
              )}
              <Link className="lead-sector__cta" href={`/search?q=${encodeURIComponent(`new ${sector} companies`)}`}>
                See the newest {sector.toLowerCase()} leads →
              </Link>
              <div className="signal-chips">
                {LEAD_CITIES.map((c) => (
                  <Link key={c} className="signal-chip" href={`/industry/${slugify(sector)}/${slugify(c)}`}>
                    {c}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="lead-builder__note mono">
          Counts are Companies House totals for the SIC codes CompaniesIQ tracks in each industry.
        </p>
      </section>

      <section className="section">
        <div className="section__head">
          <span className="eyebrow">How it works</span>
          <h2 className="section__title">From the register to a prospect list, in three steps.</h2>
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

      <section className="section section--alt">
        <div className="section__head">
          <span className="eyebrow">Who it&apos;s for</span>
          <h2 className="section__title">Leads for whatever you sell.</h2>
        </div>
        <div className="feat-grid">
          {AUDIENCES.map((a) => (
            <div className="feat" key={a.who}>
              <span className="feat__icon">
                <Icon name={a.icon} size={20} />
              </span>
              <h3 className="feat__title">{a.who}</h3>
              <p className="feat__body">{a.body}</p>
              <Link className="lead-sector__cta" href={a.href}>
                {a.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <span className="eyebrow">Target the right list</span>
          <h2 className="section__title">Start from a sector, a place, or a signal.</h2>
        </div>
        <div className="faq-grid">
          <div className="faq-item">
            <h3 className="faq-item__q">By industry</h3>
            <p className="faq-item__a">
              Build lists by sector with real formation and growth context — start with{" "}
              <Link href="/industry">industries</Link>.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">By location</h3>
            <p className="faq-item__a">
              Target <Link href="/market">regions</Link> and <Link href="/city">cities</Link> where you sell, down to
              the town.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">By new formation</h3>
            <p className="faq-item__a">
              Prospect the newest companies on the <Link href="/signals">signals</Link> pages, refreshed as they
              incorporate.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-item__q">Then monitor them</h3>
            <p className="faq-item__a">
              Add prospects to a watchlist and get alerted when they change — see{" "}
              <Link href="/company-monitoring">company monitoring</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--alt" id="weekly">
        <div className="section__head">
          <span className="eyebrow">Free weekly email</span>
          <h2 className="section__title">Get new business leads in your inbox every week.</h2>
        </div>
        <div className="fa-card" style={{ maxWidth: 560, margin: "0 auto" }}>
          <FreeAlertForm source="business-leads" />
        </div>
      </section>

      <section className="faq">
        <div className="section__head">
          <span className="eyebrow">FAQ</span>
          <h2 className="section__title">UK business leads, answered.</h2>
        </div>
        <div className="faq-grid">
          {FAQS.map(([q, a]) => (
            <div className="faq-item" key={q}>
              <h3 className="faq-item__q">{q}</h3>
              <p className="faq-item__a">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta ciq-dark">
        <div className="cta__inner">
          <h2 className="cta__title">Find your next customers before anyone else.</h2>
          <p className="cta__sub">Free to search the register. Upgrade to build, enrich and export targeted prospect lists.</p>
          <div className="cta__actions">
            <Button href="#build" variant="primary" size="lg" iconRight="arrowRight">
              Build a lead list
            </Button>
            <Button href="/pricing" variant="ghost" size="lg">
              See pricing
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
