// ============================================================
// Commercial Opportunity markets
// ------------------------------------------------------------
// A market is a named group of SIC codes that a supplier would
// recognise as one set of customers ("new accountancy firms"),
// plus the editorial half of the report: who sells into it and
// why the first months matter.
//
// The numbers in a Commercial Opportunity edition come from the
// register. The buyer list does not — it is written once, here,
// reviewed like any other copy, and stays general. It must never
// claim a statistic, and it describes typical needs of a newly
// formed company in the market, not facts about any company in it.
//
// Adding a market here is all it takes for the scheduler, the CSV
// endpoint and the blog to pick it up.
// ============================================================

export interface MarketCode {
  code: string;
  /** SIC 2007 description, shortened only where it runs long. */
  label: string;
}

export interface MarketBuyer {
  /** Who sells into the market. */
  who: string;
  /** Why a newly formed company in this market needs it. */
  why: string;
}

export interface Market {
  /** Slug fragment and study id suffix. */
  id: string;
  /** Plural noun used in titles and the search box, e.g. "Accountancy firms". */
  name: string;
  /** The same noun as it reads mid-sentence, e.g. "accountancy firms", "software and IT companies". */
  noun: string;
  /** One-sentence definition shown at the top of the report. */
  definition: string;
  codes: MarketCode[];
  buyers: MarketBuyer[];
  /** One editorial paragraph on timing — when in a new company's life the buying happens. */
  timing: string;
}

export const MARKETS: Market[] = [
  {
    id: "accountancy-firms",
    name: "Accountancy firms",
    noun: "accountancy firms",
    definition: "Companies registered for accounting and auditing, bookkeeping or tax consultancy.",
    codes: [
      { code: "69201", label: "Accounting and auditing" },
      { code: "69202", label: "Bookkeeping" },
      { code: "69203", label: "Tax consultancy" },
    ],
    buyers: [
      { who: "Practice-management and accounting software", why: "A new practice chooses its ledger, practice-management and tax-filing stack before it takes on clients, and migrating later means moving every client." },
      { who: "Professional indemnity insurers", why: "Accountancy bodies require professional indemnity cover as a condition of practising." },
      { who: "AML compliance tools and supervisors", why: "Accountancy service providers must be supervised for anti-money-laundering purposes and run client due diligence from the first engagement." },
      { who: "Web design and marketing services", why: "A new firm's first clients usually come from referrals and local search, so a site and listings come early." },
      { who: "Recruiters and outsourced staff", why: "Growing practices add bookkeepers and trainees as the client base builds." },
    ],
    timing:
      "Most of a new practice's supplier decisions — software, insurance, supervision — are made before or alongside its first client engagements, because each one is a precondition for doing the work.",
  },
  {
    id: "marketing-agencies",
    name: "Marketing agencies",
    noun: "marketing agencies",
    definition: "Companies registered as advertising agencies, media representation, or public relations and communications.",
    codes: [
      { code: "73110", label: "Advertising agencies" },
      { code: "73120", label: "Media representation" },
      { code: "70210", label: "Public relations and communications" },
    ],
    buyers: [
      { who: "Agency software (project management, time tracking, reporting)", why: "Agencies bill for time and deliverables, so they need a system for both before the first retainer." },
      { who: "Professional indemnity insurers", why: "Client contracts commonly ask agencies to hold professional indemnity cover." },
      { who: "Freelancers and recruiters", why: "New agencies are small and scale delivery with freelancers before hiring." },
      { who: "Accountants", why: "Retainer billing, VAT and contractor payments make early bookkeeping decisions matter." },
      { who: "Ad platforms and martech resellers", why: "Agencies resell or manage tools on behalf of clients and choose partners early." },
    ],
    timing:
      "Agencies are often formed around a first client or a founder's existing relationships, so tooling and contracts are needed almost immediately rather than after a build-up period.",
  },
  {
    id: "care-providers",
    name: "Care providers",
    noun: "care providers",
    definition: "Companies registered for residential nursing care, residential care for older and disabled people, or social work without accommodation for older and disabled people.",
    codes: [
      { code: "87100", label: "Residential nursing care" },
      { code: "87300", label: "Residential care for the elderly and disabled" },
      { code: "88100", label: "Social work without accommodation for the elderly and disabled" },
    ],
    buyers: [
      { who: "CQC registration and compliance consultants", why: "In England, regulated care cannot be provided until the provider is registered with the Care Quality Commission." },
      { who: "Care management software", why: "Care planning, rostering and record-keeping systems are needed to evidence safe care from the first service user." },
      { who: "Insurers", why: "Care providers need public and employers' liability and, for clinical care, medical malpractice cover before operating." },
      { who: "Staffing agencies and training providers", why: "Recruitment, DBS checks and mandatory training come before a service can open." },
      { who: "Equipment and consumables suppliers", why: "Moving and handling equipment, PPE and consumables are bought ahead of opening." },
    ],
    timing:
      "Care companies typically spend their first months in registration and set-up rather than trading, which makes that period — not the opening — the buying window for compliance, systems and staffing.",
  },
  {
    id: "building-trades",
    name: "Building trades",
    noun: "building trade companies",
    definition: "Companies registered for electrical installation, plumbing, heating and air-conditioning installation, or other building completion and finishing.",
    codes: [
      { code: "43210", label: "Electrical installation" },
      { code: "43220", label: "Plumbing, heating and air-conditioning installation" },
      { code: "43390", label: "Other building completion and finishing" },
    ],
    buyers: [
      { who: "Trade insurers", why: "Public liability cover is a standard requirement for site work and for most contractor agreements." },
      { who: "Van leasing and vehicle finance", why: "A trade business needs a vehicle before it can take jobs, and new companies often lease rather than buy." },
      { who: "Merchants and tool suppliers", why: "New trade companies open trade accounts for materials and tools on their first jobs." },
      { who: "Accountants familiar with CIS", why: "Subcontractors working for contractors fall under the Construction Industry Scheme, which affects how they are paid and taxed." },
      { who: "Job-management and invoicing software", why: "Quoting, scheduling and invoicing tools replace paper as soon as the job volume grows." },
    ],
    timing:
      "Trade companies are usually formed by people already working in the trade, so they start taking jobs quickly — insurance, vehicles and merchant accounts are needed in the first weeks.",
  },
  {
    id: "restaurants-and-takeaways",
    name: "Restaurants and takeaways",
    noun: "restaurants and takeaways",
    definition: "Companies registered as licensed restaurants, unlicensed restaurants and cafes, or take-away food shops and mobile food stands.",
    codes: [
      { code: "56101", label: "Licensed restaurants" },
      { code: "56102", label: "Unlicensed restaurants and cafes" },
      { code: "56103", label: "Take-away food shops and mobile food stands" },
    ],
    buyers: [
      { who: "EPOS and payments providers", why: "A food business needs a till and card payments before it serves its first customer." },
      { who: "Food and drink wholesalers", why: "Supplier accounts are set up ahead of opening." },
      { who: "Delivery platforms", why: "Takeaways and many restaurants list on delivery apps at or soon after opening." },
      { who: "Insurers and energy brokers", why: "Premises, liability and energy contracts are arranged before trading." },
      { who: "Licensing and food-safety consultants", why: "Food businesses must register with their local authority before trading, and licensed premises need a premises licence." },
    ],
    timing:
      "Hospitality companies are often registered shortly before a fit-out and opening date, so the buying window is short and tied to that date.",
  },
  {
    id: "software-and-it",
    name: "Software and IT companies",
    noun: "software and IT companies",
    definition: "Companies registered for business and domestic software development, IT consultancy, or other information technology services.",
    codes: [
      { code: "62012", label: "Business and domestic software development" },
      { code: "62020", label: "IT consultancy" },
      { code: "62090", label: "Other information technology services" },
    ],
    buyers: [
      { who: "Accountants and R&D tax advisers", why: "Software companies often have qualifying R&D activity and contractor income that shapes early tax and accounting choices." },
      { who: "Cloud and developer-tool vendors", why: "Hosting, code and collaboration tools are chosen at the start and become hard to move." },
      { who: "Professional indemnity and cyber insurers", why: "Client contracts for software and IT work commonly require indemnity and cyber cover." },
      { who: "Recruiters", why: "Companies that grow past a founder or contractor hire engineers, often through agencies." },
      { who: "Legal services", why: "IP assignment, client contracts and contractor agreements matter from the first engagement." },
    ],
    timing:
      "Many companies in these codes are contractor or consultancy vehicles that start billing immediately; product companies make their tooling choices in the first months and rarely revisit them.",
  },
];

export function marketById(id: string): Market | null {
  return MARKETS.find((m) => m.id === id) ?? null;
}
