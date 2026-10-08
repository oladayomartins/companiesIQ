// ============================================================
// Use-case / persona landing pages
// ------------------------------------------------------------
// One rich, hand-authored entry per audience. These drive the
// /use-cases index and every /use-cases/[persona] page. Each is
// a genuine commercial answer ("find newly incorporated companies
// that need X") — not a thin template — so every page earns its
// place in the index. Sector/city links flow crawl equity into
// the existing /industry, /city and /signals surface.
// ============================================================
import type { IconName } from "@/components/ds";

export interface ValueProp {
  icon: IconName;
  title: string;
  body: string;
}

export interface UseCase {
  slug: string;
  persona: string; // audience noun, e.g. "Accountants"
  forLabel: string; // eyebrow, e.g. "For accountants"
  cardTitle: string; // index-card heading
  cardBody: string; // index-card blurb
  cardIcon: IconName;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string; // hero sub-heading
  jobTitle: string;
  job: string; // the commercial problem, in prose
  valueProps: ValueProp[];
  steps: [string, string, string][]; // [n, title, body]
  browse: { label: string; href: string; note: string }[];
  faqs: [string, string][];
  ctaTitle: string;
  ctaSub: string;
  ctaLabel: string;
  ctaHref: string;
  ogTitle: string;
  ogSub: string;
  /** Optional "where the demand is" block: sectors to show with live
   *  new-company counts, and what that sector typically needs from this
   *  audience. Sector names must match lib/sic sectors. */
  sectorFocus?: { sector: string; need: string }[];
  /** Industry pre-selected in the page's lead-list builder. */
  builderSector?: string;
  /** Commercial Opportunity markets this audience sells into (ids from
   *  lib/research/markets.ts), with why each matters to them. The page links
   *  the latest published edition of each. */
  markets?: { id: string; angle: string }[];
}

export const USE_CASES: UseCase[] = [
  // ---------------------------------------------------------- Accountants
  {
    slug: "accountants",
    markets: [
      { id: "building-trades", angle: "New trade companies working for contractors fall under the Construction Industry Scheme \u2014 they need an accountant who knows it." },
      { id: "software-and-it", angle: "Contractor income, R&D activity and early tax choices make new software and IT companies a natural fit for specialist accountants." },
      { id: "marketing-agencies", angle: "Retainer billing, VAT and freelancer payments make an agency's first bookkeeping decisions matter." },
      { id: "accountancy-firms", angle: "Your own market: how many new practices are registering, where, and how long they last." },
    ],
    persona: "Accountants",
    forLabel: "For accountants",
    cardTitle: "Accountants & bookkeepers",
    cardBody: "Reach newly incorporated companies that need accounting, tax and compliance support — in their first weeks.",
    cardIcon: "file",
    metaTitle: "New Client Leads for Accountants — newly incorporated UK companies",
    metaDescription:
      "Find newly incorporated UK companies that need accounting, tax and compliance support. Filter new formations by sector and location, and export a targeted list of accounting prospects. Free to start.",
    h1: "Find newly incorporated companies that need an accountant.",
    intro:
      "Every new limited company needs accounts, a tax return and a compliance calendar from day one — most don't have an accountant yet. Filter the companies that incorporated this week by sector and location, and reach them before anyone else does.",
    jobTitle: "The window is the first few weeks",
    job: "A company that has just incorporated is making its first decisions about bookkeeping, VAT registration, payroll and its year-end. The firm that reaches them first usually wins the relationship for years. But the free Companies House register can't show you 'companies formed this week near me' — CompaniesIQ can, filtered to exactly the businesses you want to serve.",
    valueProps: [
      { icon: "bell", title: "This week's new companies", body: "Every UK incorporation is searchable within 24 hours. Build a list of companies formed today, this week or this month — the ones still choosing an accountant." },
      { icon: "pin", title: "Filtered to your patch", body: "Narrow by region and city so you're only reaching companies you can realistically serve, plus by sector if you specialise (contractors, e-commerce, property, care)." },
      { icon: "users", title: "The people to contact", body: "Each company comes with its directors and registered office, so you know who founded it and where — the starting point for a personal, relevant approach." },
      { icon: "download", title: "Straight into your CRM", body: "Export the list to CSV or pull it through the API, and drop it into your outreach or practice-management tool without re-keying anything." },
    ],
    steps: [
      ["01", "Filter new incorporations", "Start from this week's new companies and narrow by region, city and — if you specialise — sector, until the list is the businesses you want as clients."],
      ["02", "Review and prioritise", "See each company's directors, location and activity, and prioritise the formations that best fit your ideal client profile."],
      ["03", "Reach out first", "Export the list and run a timely, relevant campaign — reaching founders while they're still setting up their finances."],
    ],
    browse: [
      { label: "Browse by industry", href: "/industry", note: "Target sectors you specialise in — contractors, property, healthcare, hospitality." },
      { label: "Browse by city", href: "/city", note: "Focus on companies forming in your town or region." },
      { label: "See what's forming", href: "/signals", note: "Watch new incorporations by theme as they hit the register." },
    ],
    faqs: [
      ["How can accountants find newly incorporated companies?", "Companies House publishes every new incorporation, and CompaniesIQ makes those searchable within 24 hours — filter by region, city and sector to build a list of companies formed today, this week or this month. These are the businesses making their first decisions about bookkeeping, tax and compliance, so timing your approach to their formation is far more effective than a cold generic list."],
      ["Can I find new companies near me?", "Yes. Filter new formations by UK region and city so you only see companies you can realistically serve. You can layer a sector filter on top if you specialise in, say, contractors, e-commerce sellers or property companies."],
      ["What information do I get about each company?", "Company name, number, incorporation date, registered office, SIC activity codes, status, and the directors and persons with significant control — enough to understand who founded the business, where it's based and what it does before you reach out."],
      ["Can I export the list to contact them?", "Yes. Any filtered list exports to CSV, and Team and Enterprise add API access so the companies drop straight into your CRM or practice tool. Companies House data is public record under the Open Government Licence — but your outreach still has to follow UK marketing rules (PECR/GDPR), especially for email."],
      ["Is there a free plan?", "Yes — search the whole register and view companies free, with no card. Upgrade to build, save and export larger prospect lists and add enrichment. See the pricing page for limits."],
    ],
    ctaTitle: "Reach new companies before they choose an accountant.",
    ctaSub: "Free to search the register. Upgrade to build and export targeted new-client lists.",
    ctaLabel: "Find accounting prospects",
    ctaHref: "#build",
    ogTitle: "New-client leads for accountants.",
    ogSub: "Newly incorporated UK companies that need an accountant.",
  },

  // ---------------------------------------------------------- Recruiters
  {
    slug: "recruiters",
    markets: [
      { id: "software-and-it", angle: "Software and IT companies that grow past a founder or contractor hire engineers, often through agencies." },
      { id: "care-providers", angle: "Care services can't open until recruitment, DBS checks and training are done." },
      { id: "accountancy-firms", angle: "Growing practices add bookkeepers and trainees as their client base builds." },
      { id: "marketing-agencies", angle: "New agencies scale delivery with freelancers before they hire." },
    ],
    persona: "Recruiters",
    forLabel: "For recruiters",
    cardTitle: "Recruitment agencies",
    cardBody: "Spot newly formed and fast-growing employers the moment they're about to hire — before the vacancy is even posted.",
    cardIcon: "users",
    metaTitle: "Recruitment Agency Leads — new & growing UK companies about to hire",
    metaDescription:
      "Find new and fast-growing UK companies that are about to hire. Filter new formations and growing businesses by sector and location, and build a recruitment prospect list. Free to start.",
    h1: "Find the companies that are about to start hiring.",
    intro:
      "A newly formed company that's taking on premises, raising finance or appointing directors is often weeks away from its first hires. Spot those employers early, by sector and location, and win the brief before the job is advertised.",
    jobTitle: "Get in before the vacancy is posted",
    job: "By the time a role is on a job board, every agency is chasing it. The edge is reaching employers before that — new companies scaling up, and established ones showing the signals of growth. Companies House records the formation, the new directors and the charges that hint a business is about to expand; CompaniesIQ turns those into a live list of employers worth a call.",
    valueProps: [
      { icon: "bell", title: "New employers, early", body: "See companies as they incorporate and start to build out — filter the fresh intake by sector and region to find the employers most likely to hire in your niche." },
      { icon: "trendUp", title: "Signals of growth", body: "Director appointments, new charges and fresh filings are all signs a company is scaling. Track them and reach out while the need is forming." },
      { icon: "briefcase", title: "Matched to your desk", body: "Filter by sector so tech, construction, healthcare or finance recruiters each see only the employers relevant to their market." },
      { icon: "bookmark", title: "Track and get alerted", body: "Add target employers to a watchlist and get told when they appoint directors or file changes — so you follow up at the right moment." },
    ],
    steps: [
      ["01", "Find growing employers", "Filter new formations and active companies by sector and region to surface the businesses most likely to be hiring in your market."],
      ["02", "Watch for the signal", "Track director appointments, charges and filings that indicate a company is scaling, so you time your approach."],
      ["03", "Pitch the brief first", "Reach out while the need is forming, and export the list into your CRM to work it systematically."],
    ],
    browse: [
      { label: "Browse by industry", href: "/industry", note: "Focus on the sectors your desk recruits for." },
      { label: "Browse by city", href: "/city", note: "Target employers in the areas you cover." },
      { label: "See what's forming", href: "/signals", note: "Track new companies by theme as they incorporate." },
    ],
    faqs: [
      ["How can recruiters find companies that are about to hire?", "Look for the signals of growth on the Companies House register: new incorporations, director appointments, new charges (borrowing) and fresh filings. CompaniesIQ surfaces those as they happen and lets you filter by sector and region, so you build a list of employers likely to hire — and reach them before the vacancy is advertised."],
      ["Can I find new companies in my sector and area?", "Yes. Combine sector and location filters so a construction desk in the North West, or a tech desk in London, only sees the employers relevant to it. New formations are included within 24 hours of hitting the register."],
      ["How do I know a company is growing?", "CompaniesIQ tracks the public signals of growth — director and officer appointments, registered charges, and filing activity. You can add companies to a watchlist and be alerted when these events occur, which is often the moment a business is gearing up to hire."],
      ["Can I export the leads into my CRM?", "Yes. Any list exports to CSV, and Team and Enterprise include API access to push employers straight into your recruitment CRM. Data is public record under the Open Government Licence; your outreach still has to follow UK marketing rules."],
      ["Is there a free plan?", "Yes — search the register and view companies free. Upgrade to build and export larger prospect lists, add enrichment and set up watchlist alerts. See pricing for limits."],
    ],
    ctaTitle: "Win the brief before the job is posted.",
    ctaSub: "Free to search. Upgrade to track growing employers and export recruitment leads.",
    ctaLabel: "Find hiring employers",
    ctaHref: "#build",
    ogTitle: "Recruitment leads that are about to hire.",
    ogSub: "New & growing UK employers, before the vacancy is posted.",
  },

  // ---------------------------------------------------------- Marketing agencies
  {
    slug: "marketing-agencies",
    markets: [
      { id: "accountancy-firms", angle: "A new practice's first clients come from referrals and local search \u2014 a site and listings come early." },
      { id: "marketing-agencies", angle: "Your own market: how many new agencies are registering, where, and how long they last." },
    ],
    persona: "Marketing agencies",
    forLabel: "For agencies",
    cardTitle: "Marketing, web & SEO agencies",
    cardBody: "Find new businesses that need a website, branding and marketing — the moment they incorporate.",
    cardIcon: "trendUp",
    metaTitle: "Agency Leads — new UK businesses that need marketing, web & SEO",
    metaDescription:
      "Find newly registered UK businesses that need a website, branding, marketing and SEO. Filter new formations by sector and location and export a targeted agency prospect list. Free to start.",
    h1: "Find new businesses before they build their website.",
    intro:
      "A company that incorporated this week needs a name, a brand, a website and a way to be found — and hasn't chosen an agency yet. Filter the newest UK businesses by sector and location and pitch while the decisions are still open.",
    jobTitle: "The first weeks are when the work gets commissioned",
    job: "New businesses decide on branding, a website and their marketing in their earliest weeks — and once they've picked an agency, that door closes for a year or more. The problem is finding them at that exact moment. CompaniesIQ lists every new incorporation within 24 hours, filtered to the sectors and places where your agency does its best work.",
    valueProps: [
      { icon: "bell", title: "Newly formed businesses", body: "Every UK incorporation, searchable within 24 hours — build a rolling list of companies that need a brand, a site and a marketing plan and haven't commissioned one yet." },
      { icon: "filter", title: "Your ideal client, filtered", body: "Narrow by sector and location so you pitch the businesses that match your positioning — local trades, e-commerce, professional services or funded startups." },
      { icon: "globe", title: "Context before you pitch", body: "Sector, region and activity data on every company means your outreach can be specific and relevant, not a generic 'we do websites' email." },
      { icon: "download", title: "Feed your pipeline", body: "Export the list to CSV or the API and run it through your outbound — a fresh batch of qualified prospects every week." },
    ],
    steps: [
      ["01", "Filter the newest businesses", "Start from this week's incorporations and narrow by sector and location to the companies that fit your agency."],
      ["02", "Qualify the fit", "Use each company's sector, location and activity to shortlist the ones most likely to need — and pay for — your services."],
      ["03", "Pitch while it's open", "Export and run timely outreach, reaching founders before they've chosen an agency."],
    ],
    browse: [
      { label: "Browse by industry", href: "/industry", note: "Target the sectors your agency positions around." },
      { label: "Browse by city", href: "/city", note: "Win local clients in the areas you serve." },
      { label: "Marketing companies", href: "/signals/marketing", note: "See the marketing sector forming in real time." },
    ],
    faqs: [
      ["How can agencies find new businesses that need a website?", "New companies need branding, a website and marketing in their first weeks — and CompaniesIQ lists every UK incorporation within 24 hours. Filter by sector and location to build a list of businesses that fit your agency, then reach out while they're still making those decisions."],
      ["Can I find new companies needing marketing or SEO in a specific area?", "Yes. Combine location and sector filters — for example new e-commerce companies nationally, or new professional-services firms in your city — so you only pitch businesses you can genuinely help and reach."],
      ["What details do I get to personalise outreach?", "Company name, incorporation date, registered office, SIC activity codes, status and the directors — enough to make your pitch specific to what the business actually does and who founded it, rather than a generic template."],
      ["Can I export the prospects?", "Yes. Any list exports to CSV, and Team and Enterprise add API access to push prospects into your outbound tool. The data is public record under the Open Government Licence; your outreach still needs to follow UK marketing rules (PECR/GDPR)."],
      ["Is there a free plan?", "Yes — search the register and view companies free, no card required. Upgrade to build, save and export targeted prospect lists. See the pricing page."],
    ],
    ctaTitle: "Reach new businesses before they pick an agency.",
    ctaSub: "Free to search. Upgrade to build and export a weekly pipeline of agency prospects.",
    ctaLabel: "Find agency prospects",
    ctaHref: "#build",
    ogTitle: "Agency leads: new businesses that need you.",
    ogSub: "Website, branding & marketing prospects, freshly formed.",
  },

  // ---------------------------------------------------------- Sales teams
  {
    slug: "sales-teams",
    markets: [
      { id: "software-and-it", angle: "" },
      { id: "building-trades", angle: "" },
      { id: "restaurants-and-takeaways", angle: "" },
      { id: "care-providers", angle: "" },
      { id: "marketing-agencies", angle: "" },
      { id: "accountancy-firms", angle: "" },
    ],
    persona: "B2B sales teams",
    forLabel: "For sales teams",
    cardTitle: "B2B sales teams",
    cardBody: "Build targeted account lists by sector, size and location — and hand sales a clean, exportable set of prospects.",
    cardIcon: "briefcase",
    metaTitle: "B2B Prospecting — build targeted UK account lists from the register",
    metaDescription:
      "Build targeted B2B prospect lists from the UK company register. Filter companies by sector, region, size, age and status, enrich them, and export clean account lists to your CRM. Free to start.",
    h1: "Build a targeted UK prospect list in minutes.",
    intro:
      "Stop buying stale lists. Filter the live register by sector, region, size, age and status to define your ideal customer profile exactly, then export a clean, current set of accounts straight into your CRM.",
    jobTitle: "Your ICP, defined and exportable",
    job: "Good outbound starts with a good list — accounts that actually match your ideal customer profile. Bought lists go stale and are shared with everyone; building by hand from Companies House is slow. CompaniesIQ lets you express your ICP as filters — sector, region, size, age, status — and turns it into a fresh, exportable account list in minutes.",
    valueProps: [
      { icon: "filter", title: "Define your ICP as filters", body: "Combine sector, region, city, company size, age and status to describe exactly the accounts you want — then see every UK company that matches." },
      { icon: "bell", title: "Fresh, not recycled", body: "Every list is built from the live register, including companies formed this week — so your reps work accounts that haven't been emailed by everyone else already." },
      { icon: "building", title: "Real firmographics", body: "Each account comes with activity, location, directors and, where filed, accounts signals — the context reps need to prioritise and personalise." },
      { icon: "download", title: "Clean CSV & API export", body: "Push the list to CSV or straight through the API into your CRM, dated and sourced, ready to sequence." },
    ],
    steps: [
      ["01", "Describe your ICP", "Set filters for sector, region, size, age and status until the matching companies are your ideal accounts."],
      ["02", "Enrich and prioritise", "Review firmographics and signals to rank the accounts most worth a rep's time."],
      ["03", "Export to CRM", "Send the clean, current list to your CRM and start sequencing — no stale data, no re-keying."],
    ],
    browse: [
      { label: "Browse by industry", href: "/industry", note: "Anchor your ICP on the sectors you sell into." },
      { label: "Browse by region", href: "/market", note: "Segment territories by UK region." },
      { label: "UK business leads", href: "/business-leads", note: "See the full lead-generation workflow." },
    ],
    faqs: [
      ["How do I build a B2B prospect list for the UK?", "Define your ideal customer profile as filters — sector, region, city, company size, age and status — against the live UK company register, and CompaniesIQ returns every matching company. Export the list to CSV or your CRM. Because it's built from the live register, it includes current and newly formed companies rather than a recycled static file."],
      ["Can I target accounts by size and sector?", "Yes. Combine SIC sector with company size, age, region and status to match your ICP precisely — for example established manufacturers in the Midlands, or newly formed SaaS companies nationally."],
      ["How is this better than buying a list?", "Bought lists are static, often out of date, and sold to many buyers. Here every account is a real, current company from the live register, filtered to your criteria and dated — including businesses that only just incorporated, which no bought list will have."],
      ["Can I push accounts into my CRM?", "Yes. Any list exports to CSV, and Team and Enterprise include API access to sync companies directly into your CRM or sales-engagement tool. Every field is sourced from the public register and dated."],
      ["Do I need to worry about compliance?", "The register is public record under the Open Government Licence, and using it to identify accounts is legitimate. Your outreach still has to comply with UK rules (PECR/GDPR), particularly for electronic marketing — that responsibility stays with you."],
    ],
    ctaTitle: "Give your reps a list worth working.",
    ctaSub: "Free to search. Upgrade to build, enrich and export targeted account lists.",
    ctaLabel: "Build a prospect list",
    ctaHref: "#build",
    ogTitle: "B2B prospecting on the live register.",
    ogSub: "Define your ICP as filters, export clean accounts.",
  },

  // ---------------------------------------------------------- Investors
  {
    slug: "investors",
    markets: [
      { id: "software-and-it", angle: "Where new technology companies are forming, quarter by quarter, and how fast the market is moving." },
      { id: "care-providers", angle: "A regulated market where new entrants spend their first months in registration and set-up." },
      { id: "building-trades", angle: "A large market of owner-operated trade companies — how many form each quarter, where, and how long they last." },
    ],
    persona: "Investors & analysts",
    forLabel: "For investors",
    cardTitle: "Investors & analysts",
    cardBody: "Discover new startups and emerging sectors as they form, and track high-growth companies from live formation data.",
    cardIcon: "barChart",
    metaTitle: "UK Startup & Deal Sourcing — discover new companies and emerging sectors",
    metaDescription:
      "Discover newly formed UK startups and emerging sectors as they appear, and track high-growth companies and regions from live Companies House formation data. Free to start.",
    h1: "Find new UK companies and emerging sectors first.",
    intro:
      "The best deals are visible in the formation data before they're on anyone's radar. Track new incorporations by sector and region, spot where formation is accelerating, and build a pipeline of companies to watch as they grow.",
    jobTitle: "See the sector move before the market does",
    job: "By the time a startup is raising publicly, it's competitive. Earlier signals sit in the register — a cluster of new incorporations in a sector, a region where formation is accelerating, a company appointing directors and registering charges. CompaniesIQ turns the register into a sourcing and market-intelligence tool so you see momentum forming, not just report on it afterwards.",
    valueProps: [
      { icon: "bell", title: "New companies as they form", body: "Track incorporations by sector, theme and region within 24 hours — a live top of funnel for sourcing, before companies are visible elsewhere." },
      { icon: "trendUp", title: "Emerging-sector signal", body: "See which sectors and regions are accelerating from real formation, growth and survival data — spot the theme while it's still early." },
      { icon: "barChart", title: "Market intelligence", body: "Roll millions of filings into sector and regional trends to size a market, benchmark a thesis, or brief an investment committee." },
      { icon: "bookmark", title: "Watch and track", body: "Add companies and sectors to a watchlist and get alerted on director appointments, charges and filings as they scale." },
    ],
    steps: [
      ["01", "Track the formation data", "Follow new incorporations by sector, theme and region to build a live pipeline of companies to watch."],
      ["02", "Read the trend", "Use sector and regional growth and survival data to see where momentum is building and test a thesis."],
      ["03", "Watch them grow", "Add companies to a watchlist and get alerted as they appoint directors, raise charges and file — the signals of scaling."],
    ],
    browse: [
      { label: "Explore markets", href: "/market", note: "Regional growth and formation trends across the UK." },
      { label: "Browse by industry", href: "/industry", note: "Sector formation, growth and survival data." },
      { label: "See what's forming", href: "/signals", note: "New companies by theme — AI, fintech, cleantech and more." },
    ],
    faqs: [
      ["How can I find newly formed UK startups?", "Companies House records every incorporation, and CompaniesIQ makes new companies searchable by sector, theme and region within 24 hours. That gives you a live top of funnel for sourcing — including companies that aren't yet visible on the usual startup lists or press."],
      ["Can I see which sectors are growing fastest?", "Yes. CompaniesIQ aggregates formation, growth and survival data by sector and region, so you can see where incorporation is accelerating and which themes — such as AI, fintech or cleantech — are emerging, rather than relying on lagging reports."],
      ["Can I track a company as it scales?", "Yes. Add companies to a watchlist and get alerted on director appointments, registered charges and new filings — the public signals that a company is growing, raising or restructuring."],
      ["Where does the market data come from?", "Company data is the live Companies House register under the Open Government Licence; sector and regional context is added from ONS and Nomis. Every figure is dated and sourced, and nothing is fabricated — unmeasurable values are marked 'Not Assessed'."],
      ["Is there a free plan?", "Yes — explore markets, sectors and companies free. Upgrade for watchlists, alerts and export. See the pricing page for limits."],
    ],
    ctaTitle: "Source from the formation data.",
    ctaSub: "Free to explore. Upgrade to track companies and export market intelligence.",
    ctaLabel: "Explore new companies",
    ctaHref: "#build",
    ogTitle: "Deal sourcing from the register.",
    ogSub: "New UK startups and emerging sectors, as they form.",
  },

  // ---------------------------------------------------------- Insurance / finance brokers
  {
    slug: "insurance-brokers",
    markets: [
      { id: "building-trades", angle: "Public liability is a standard requirement for site work and most contractor agreements." },
      { id: "restaurants-and-takeaways", angle: "Premises, liability and energy contracts are arranged before a food business trades." },
      { id: "care-providers", angle: "Care providers need liability cover \u2014 and for clinical care, malpractice cover \u2014 before operating." },
      { id: "software-and-it", angle: "Client contracts for software and IT work commonly require indemnity and cyber cover." },
      { id: "marketing-agencies", angle: "Client contracts commonly ask agencies to hold professional indemnity cover." },
      { id: "accountancy-firms", angle: "Accountancy bodies require professional indemnity cover as a condition of practising." },
    ],
    persona: "Commercial insurance brokers",
    forLabel: "For insurance brokers",
    cardTitle: "Commercial insurance brokers",
    cardBody: "Business insurance leads from the companies forming this week — matched to the trades and risks you write.",
    cardIcon: "shield",
    // Search Console (Oct 2026): this page drew 2,297 impressions at position
    // ~77 on "insurance leads", "business insurance leads", "leads for
    // insurance brokers"… — under a "Broker Leads … insurance & finance"
    // title that never said "insurance leads". Retargeted at the B2B slice of
    // that demand (commercial lines), which new companies genuinely are.
    metaTitle: "Business Insurance Leads for UK Brokers",
    metaDescription:
      "Commercial insurance leads from the live Companies House register: every new UK business by trade and town, the week it forms. Build a broker list free.",
    h1: "Business insurance leads, from the companies forming this week.",
    intro:
      "Every new company is a commercial insurance buyer: employers' liability once it takes on staff, public liability, cover for vehicles, premises and the work it does. Find the newest UK businesses by trade and town and reach them before they've placed their cover.",
    jobTitle: "New businesses are placing their first cover now",
    job: "Most UK employers are legally required to hold employers' liability insurance — with at least £5 million of cover — from the day they take on staff, and any vehicle on the road must be insured. Beyond that, the covers a new business needs follow its trade: contractors need public liability and contractors' all risks, cafés need premises and product liability, consultancies need professional indemnity. Those first policies are often bought in the company's first weeks, and the broker who reaches the director then — with cover that fits the trade — wins the account and the renewals. Companies House shows you which businesses just formed and what they do; CompaniesIQ turns that into a targeted, dated list.",
    valueProps: [
      { icon: "bell", title: "This week's new businesses", body: "Every UK incorporation, searchable within 24 hours — a rolling list of companies placing their first commercial cover." },
      { icon: "filter", title: "Matched to the risks you write", body: "Filter by trade so the cover fits — construction and trades, hospitality, transport, professional services, technology or healthcare." },
      { icon: "pin", title: "In your territory", body: "Narrow by town and region to the businesses you can serve, and work the local formations first." },
      { icon: "download", title: "A pipeline, not a bought list", body: "Build, save and export your own dated list every week — instead of buying shared, resold leads of unknown age." },
    ],
    steps: [
      ["01", "Pick the trades you write", "Start from this week's incorporations and narrow by trade and town to the businesses whose risk fits your book."],
      ["02", "Qualify the fit", "Use the activity code, registered office and directors to judge the trade, the likely size and who to speak to."],
      ["03", "Reach them first", "Export the list and get in touch while they're still placing employers' liability, public liability and their first policies."],
    ],
    browse: [
      { label: "New construction companies", href: "/industry/construction", note: "Contractors and trades: public liability, employers' liability, contractors' all risks." },
      { label: "New hospitality businesses", href: "/industry/hospitality", note: "Cafés, restaurants and pubs: premises, product and public liability." },
      { label: "Browse by city", href: "/city", note: "Focus on new businesses in your territory." },
    ],
    sectorFocus: [
      { sector: "Construction", need: "Public liability, employers' liability, contractors' all risks, tools and plant." },
      { sector: "Hospitality", need: "Premises and contents, public and product liability, business interruption, employers' liability." },
      { sector: "Healthcare & social", need: "Medical malpractice or professional indemnity, public liability, employers' liability." },
      { sector: "Professional services", need: "Professional indemnity, cyber, office contents and public liability." },
      { sector: "Technology", need: "Professional indemnity (tech E&O), cyber liability, equipment." },
      { sector: "Retail & wholesale", need: "Stock and premises, product liability, public liability, goods in transit." },
    ],
    builderSector: "Construction",
    faqs: [
      ["Where can insurance brokers find commercial insurance leads?", "The most reliable source is the Companies House register: every new UK company appears within days of incorporating, with its trade (SIC code), registered office and directors. CompaniesIQ makes that searchable within 24 hours — filter new formations by trade and town and you have a dated list of businesses placing their first commercial cover."],
      ["Do new limited companies need business insurance?", "Most do. Employers' liability insurance is a legal requirement for most UK employers from the day they take on staff, with at least £5 million of cover, and any vehicle used on the road must be insured. Other covers — public liability, professional indemnity, property — depend on the trade, its contracts and, for some professions, its regulator."],
      ["Should I buy insurance leads or build my own list?", "Bought insurance leads are often consumer enquiries, sold to several brokers at once, and of unknown age. A list built from the register is business-to-business, dated to the day each company formed, and filtered to the trades you write. The register is public, so the edge is speed and fit: reaching the right new businesses in their first weeks."],
      ["Can I target the trades whose risk I write?", "Yes. Filter new formations by sector — construction and trades, hospitality, transport and logistics, technology, healthcare or professional services — and layer a town or region on top."],
      ["What do I learn about each business?", "Company name, incorporation date, registered office, activity codes, status and the directors — enough to gauge the trade, the likely size and who to approach before you make contact."],
      ["Can I export the leads?", "Yes. Lists export to CSV, and Team and Enterprise include API access to push prospects into your CRM. Companies House data is public record under the Open Government Licence; your outreach must still follow UK marketing rules (PECR and UK GDPR)."],
      ["Is there a free plan?", "Yes — search the register and view companies free, no card needed. Upgrade to save, track and export full broker lists. See the pricing page for limits."],
    ],
    ctaTitle: "Reach new businesses before they've placed their cover.",
    ctaSub: "Free to search. Upgrade to save, track and export a weekly broker pipeline.",
    ctaLabel: "Build a broker lead list",
    ctaHref: "#build",
    ogTitle: "Business insurance leads for brokers.",
    ogSub: "New UK businesses placing their first commercial cover.",
  },
];

export function getUseCase(slug: string): UseCase | undefined {
  return USE_CASES.find((u) => u.slug === slug);
}
