// ============================================================
// Companies House collection engine
// ------------------------------------------------------------
// A thin, typed client over the Companies House public REST API
// (https://developer.company-information.service.gov.uk/). Auth is
// HTTP Basic with the API key as the username and an empty password.
// Responses are normalised into the CompaniesIQ internal model and
// enriched through the SIC + geographic engines.
//
// Data © Crown copyright, Companies House. Reused under the Open
// Government Licence.
// ============================================================
import "server-only";
import type { Company, Officer, Filing, Charge, SearchResult, OfficerAppointment, OfficerProfile, PSC } from "./types";
import { classifyMany, classifySic } from "./sic";
import { resolveGeo } from "./geography";
import { titleCaseName } from "./format";

const BASE = "https://api.company-information.service.gov.uk";

export class CompaniesHouseError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CompaniesHouseError";
    this.status = status;
  }
}

export function hasApiKey(): boolean {
  return !!process.env.COMPANIES_HOUSE_API_KEY;
}

async function chFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) {
    throw new CompaniesHouseError(
      "COMPANIES_HOUSE_API_KEY is not set. Add a free key from developer.company-information.service.gov.uk to .env.local",
      503
    );
  }
  const auth = Buffer.from(`${key}:`).toString("base64");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      ...(init?.headers || {}),
    },
    // The register updates daily; cache for a few minutes to stay
    // within rate limits (600 requests / 5 min).
    next: { revalidate: 300 },
  });
  if (res.status === 404) throw new CompaniesHouseError("Not found", 404);
  if (res.status === 429) throw new CompaniesHouseError("Rate limited by Companies House — try again shortly.", 429);
  if (!res.ok) throw new CompaniesHouseError(`Companies House returned ${res.status}`, res.status);
  return (await res.json()) as T;
}

// ---------------------------------------------------------------
// Search
// ---------------------------------------------------------------
interface CHSearchItem {
  company_number: string;
  title: string;
  company_status: string;
  date_of_creation?: string;
  address_snippet?: string;
  address?: { postal_code?: string; locality?: string; region?: string };
}
interface CHSearchResponse {
  total_results: number;
  items: CHSearchItem[];
}

export async function searchCompanies(q: string, opts: { perPage?: number; startIndex?: number } = {}): Promise<{ total: number; results: SearchResult[] }> {
  const perPage = opts.perPage ?? 30;
  const startIndex = opts.startIndex ?? 0;
  const data = await chFetch<CHSearchResponse>(
    `/search/companies?q=${encodeURIComponent(q)}&items_per_page=${perPage}&start_index=${startIndex}`
  );
  const results: SearchResult[] = (data.items || []).map((it) => {
    const geo = resolveGeo({ postcode: it.address?.postal_code, locality: it.address?.locality });
    return {
      number: it.company_number,
      name: titleCaseName(it.title),
      status: it.company_status,
      incorporated: it.date_of_creation,
      address: it.address_snippet,
      sicCodes: [],
      region: geo.region,
    };
  });
  return { total: data.total_results ?? results.length, results };
}

// ---------------------------------------------------------------
// Advanced search — filter by SIC codes, status, incorporation date,
// region. Powers the explorer facets and trend aggregation.
// ---------------------------------------------------------------
interface CHAdvancedItem {
  company_number: string;
  company_name: string;
  company_status: string;
  date_of_creation?: string;
  company_type?: string;
  sic_codes?: string[];
  registered_office_address?: { postal_code?: string; locality?: string; region?: string };
}
interface CHAdvancedResponse {
  hits: number;
  items: CHAdvancedItem[];
}

export interface AdvancedSearchParams {
  q?: string;
  sicCodes?: string[];
  status?: string[];
  companyType?: string[];
  location?: string; // registered-office locality (free text)
  incorporatedFrom?: string; // YYYY-MM-DD
  incorporatedTo?: string;
  dissolvedFrom?: string; // YYYY-MM-DD
  dissolvedTo?: string;
  size?: number;
  startIndex?: number;
}

export async function advancedSearch(params: AdvancedSearchParams): Promise<{ total: number; results: SearchResult[] }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("company_name_includes", params.q);
  (params.sicCodes || []).forEach((c) => qs.append("sic_codes", c));
  (params.status || []).forEach((s) => qs.append("company_status", s));
  (params.companyType || []).forEach((t) => qs.append("company_type", t));
  if (params.location) qs.set("location", params.location);
  if (params.incorporatedFrom) qs.set("incorporated_from", params.incorporatedFrom);
  if (params.incorporatedTo) qs.set("incorporated_to", params.incorporatedTo);
  if (params.dissolvedFrom) qs.set("dissolved_from", params.dissolvedFrom);
  if (params.dissolvedTo) qs.set("dissolved_to", params.dissolvedTo);
  qs.set("size", String(params.size ?? 40));
  if (params.startIndex) qs.set("start_index", String(params.startIndex));

  const data = await chFetch<CHAdvancedResponse>(`/advanced-search/companies?${qs.toString()}`);
  const results: SearchResult[] = (data.items || []).map((it) => {
    const geo = resolveGeo({ postcode: it.registered_office_address?.postal_code, locality: it.registered_office_address?.locality });
    const primary = it.sic_codes?.[0];
    return {
      number: it.company_number,
      name: titleCaseName(it.company_name),
      status: it.company_status,
      incorporated: it.date_of_creation,
      sicCodes: it.sic_codes || [],
      classification: primary ? classifySic(primary) : undefined,
      region: geo.region,
      locality: geo.locality,
      postcode: it.registered_office_address?.postal_code,
      companyType: it.company_type,
    };
  });
  return { total: data.hits ?? results.length, results };
}

/** Return only the total hit count for a filter (size=1, cheap). Live counts. */
export async function countCompanies(params: AdvancedSearchParams): Promise<number> {
  const r = await advancedSearch({ ...params, size: 1 });
  return r.total;
}

export function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------
// Company profile
// ---------------------------------------------------------------
interface CHProfile {
  company_number: string;
  company_name: string;
  company_status: string;
  type?: string;
  date_of_creation?: string;
  date_of_cessation?: string;
  sic_codes?: string[];
  registered_office_address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  accounts?: {
    next_due?: string;
    overdue?: boolean;
    next_accounts?: { due_on?: string; overdue?: boolean };
    last_accounts?: { made_up_to?: string };
  };
  confirmation_statement?: { next_due?: string; overdue?: boolean; last_made_up_to?: string };
}

const TYPE_LABELS: Record<string, string> = {
  ltd: "Private limited company",
  plc: "Public limited company",
  llp: "Limited liability partnership",
  "private-unlimited": "Private unlimited company",
  "private-limited-guarant-nsc": "Company limited by guarantee",
  "community-interest-company": "Community interest company",
  "old-public-company": "Old public company",
  "private-limited-shares-section-30-exemption": "Private limited (s.30 exemption)",
};

export async function getCompany(number: string): Promise<Company> {
  const p = await chFetch<CHProfile>(`/company/${encodeURIComponent(number)}`);
  const classifications = classifyMany(p.sic_codes || []);
  const geo = resolveGeo({ postcode: p.registered_office_address?.postal_code, locality: p.registered_office_address?.locality });
  return {
    number: p.company_number,
    name: titleCaseName(p.company_name),
    status: p.company_status,
    type: p.type ? TYPE_LABELS[p.type] || p.type : undefined,
    incorporated: p.date_of_creation,
    dissolved: p.date_of_cessation,
    sicCodes: p.sic_codes || [],
    classifications,
    primaryClassification: classifications[0],
    address: p.registered_office_address
      ? {
          line1: p.registered_office_address.address_line_1,
          line2: p.registered_office_address.address_line_2,
          locality: p.registered_office_address.locality,
          region: p.registered_office_address.region,
          postcode: p.registered_office_address.postal_code,
          country: p.registered_office_address.country,
        }
      : undefined,
    geo,
    accounts: p.accounts
      ? {
          nextDue: p.accounts.next_accounts?.due_on ?? p.accounts.next_due,
          lastMadeUpTo: p.accounts.last_accounts?.made_up_to,
          // Prefer CH's own overdue flag; fall back to comparing the due date.
          overdue:
            p.accounts.next_accounts?.overdue ??
            p.accounts.overdue ??
            isPastDue(p.accounts.next_accounts?.due_on ?? p.accounts.next_due),
        }
      : undefined,
    confirmationStatement: p.confirmation_statement
      ? {
          nextDue: p.confirmation_statement.next_due,
          lastMadeUpTo: p.confirmation_statement.last_made_up_to,
          overdue: p.confirmation_statement.overdue ?? isPastDue(p.confirmation_statement.next_due),
        }
      : undefined,
    employees: null,
    revenue: null,
  };
}

/** True when an ISO due-date is strictly in the past (UTC). undefined → false. */
function isPastDue(due?: string): boolean {
  if (!due) return false;
  const t = Date.parse(due);
  return Number.isFinite(t) && t < Date.now();
}

// ---------------------------------------------------------------
// Officers
// ---------------------------------------------------------------
interface CHOfficerItem {
  name: string;
  officer_role?: string;
  appointed_on?: string;
  resigned_on?: string;
  nationality?: string;
  occupation?: string;
  officer_attributes?: unknown;
  links?: { officer?: { appointments?: string } };
}
interface CHOfficers {
  items: CHOfficerItem[];
}

function roleLabel(role?: string): string {
  if (!role) return "Officer";
  return role
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Pull the officer id from an /officers/{id}/appointments link. */
function officerIdFromLink(link?: string): string | undefined {
  const m = link?.match(/\/officers\/([^/]+)\/appointments/);
  return m ? m[1] : undefined;
}

export async function getOfficers(number: string): Promise<Officer[]> {
  const data = await chFetch<CHOfficers>(`/company/${encodeURIComponent(number)}/officers?items_per_page=35`);
  return (data.items || []).map((o) => ({
    name: titleCaseName(o.name),
    role: roleLabel(o.officer_role),
    appointed: o.appointed_on,
    resigned: o.resigned_on,
    status: o.resigned_on ? "resigned" : "active",
    kind: o.officer_role?.includes("corporate") ? "company" : "person",
    nationality: o.nationality,
    occupation: o.occupation,
    officerId: officerIdFromLink(o.links?.officer?.appointments),
  }));
}

// ---------------------------------------------------------------
// Officer appointments — the basis of director / serial-founder
// intelligence. One officer id resolves to every company they are
// (or were) appointed to across the register.
// ---------------------------------------------------------------
interface CHAppointmentItem {
  appointed_to?: { company_number?: string; company_name?: string; company_status?: string };
  officer_role?: string;
  appointed_on?: string;
  resigned_on?: string;
}
interface CHAppointments {
  name?: string;
  date_of_birth?: { month?: number; year?: number };
  is_corporate_officer?: boolean;
  total_results?: number;
  items?: CHAppointmentItem[];
}

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export async function getOfficerAppointments(officerId: string): Promise<OfficerProfile> {
  const data = await chFetch<CHAppointments>(`/officers/${encodeURIComponent(officerId)}/appointments?items_per_page=50`);
  const appointments: OfficerAppointment[] = (data.items || []).map((a) => {
    const sic = undefined; // SIC not returned here; sector enriched lazily on the page if needed
    return {
      companyNumber: a.appointed_to?.company_number || "",
      companyName: titleCaseName(a.appointed_to?.company_name || ""),
      companyStatus: a.appointed_to?.company_status,
      role: roleLabel(a.officer_role),
      appointed: a.appointed_on,
      resigned: a.resigned_on,
      active: !a.resigned_on,
      sector: sic,
    };
  });
  const dob = data.date_of_birth?.year ? `${data.date_of_birth.month ? MONTHS[data.date_of_birth.month] + " " : ""}${data.date_of_birth.year}` : undefined;
  return {
    officerId,
    name: titleCaseName(data.name || ""),
    dateOfBirth: dob,
    isCorporate: !!data.is_corporate_officer,
    totalAppointments: data.total_results ?? appointments.length,
    activeAppointments: appointments.filter((a) => a.active).length,
    appointments,
  };
}

interface CHOfficerSearchItem {
  title: string;
  description?: string;
  address_snippet?: string;
  links?: { self?: string };
}
interface CHOfficerSearch {
  total_results: number;
  items: CHOfficerSearchItem[];
}

export async function searchOfficers(q: string): Promise<{ total: number; officers: { officerId: string; name: string; description?: string; address?: string }[] }> {
  const data = await chFetch<CHOfficerSearch>(`/search/officers?q=${encodeURIComponent(q)}&items_per_page=20`);
  const officers = (data.items || [])
    .map((it) => {
      const m = it.links?.self?.match(/\/officers\/([^/]+)\/appointments/) || it.links?.self?.match(/\/officers\/([^/]+)/);
      return { officerId: m ? m[1] : "", name: titleCaseName(it.title), description: it.description, address: it.address_snippet };
    })
    .filter((o) => o.officerId);
  return { total: data.total_results ?? officers.length, officers };
}

// ---------------------------------------------------------------
// Filing history
// ---------------------------------------------------------------
interface CHFilingItem {
  date?: string;
  type?: string;
  category?: string;
  description?: string;
  description_values?: Record<string, string>;
}
interface CHFilings {
  items: CHFilingItem[];
}

const FILING_DESCRIPTIONS: Record<string, string> = {
  "accounts-with-accounts-type-full": "Full accounts",
  "accounts-with-accounts-type-micro-entity": "Micro-entity accounts",
  "accounts-with-accounts-type-small": "Small company accounts",
  "confirmation-statement": "Confirmation statement",
  "confirmation-statement-with-updates": "Confirmation statement with updates",
  "appoint-person-director-company": "Director appointed",
  "termination-director-company": "Director resignation",
  "change-registered-office-address-company": "Registered office address changed",
  "incorporation-company": "Incorporation",
  "create-charge": "Charge registered",
};

export async function getFilingHistory(number: string): Promise<Filing[]> {
  const data = await chFetch<CHFilings>(`/company/${encodeURIComponent(number)}/filing-history?items_per_page=25`);
  return (data.items || []).map((f) => ({
    date: f.date || "",
    type: (f.type || f.category || "").toUpperCase().slice(0, 6) || "FILING",
    label: f.description ? FILING_DESCRIPTIONS[f.description] || prettyDescription(f.description) : f.category || "Filing",
  }));
}

function prettyDescription(d: string): string {
  return d.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------
// Charges
// ---------------------------------------------------------------
interface CHChargeItem {
  classification?: { description?: string };
  status?: string;
  created_on?: string;
  delivered_on?: string;
  persons_entitled?: { name?: string }[];
}
interface CHCharges {
  items: CHChargeItem[];
}

export async function getCharges(number: string): Promise<Charge[]> {
  try {
    const data = await chFetch<CHCharges>(`/company/${encodeURIComponent(number)}/charges`);
    return (data.items || []).map((c) => ({
      classification: c.classification?.description || "Charge",
      status: c.status || "outstanding",
      created: c.created_on,
      delivered: c.delivered_on,
      personsEntitled: (c.persons_entitled || []).map((p) => p.name || "").filter(Boolean),
    }));
  } catch (e) {
    if (e instanceof CompaniesHouseError && e.status === 404) return [];
    throw e;
  }
}

// ---------------------------------------------------------------
// Persons with significant control (PSC)
// ---------------------------------------------------------------
interface CHPscItem {
  name?: string;
  kind?: string; // individual-person-with-significant-control | corporate-entity-... | super-secure-... | ...-statement
  natures_of_control?: string[];
  notified_on?: string;
  ceased_on?: string;
  nationality?: string;
  country_of_residence?: string;
}
interface CHPscs {
  items?: CHPscItem[];
}

/** Map a Companies House nature-of-control code to a readable phrase. */
export function natureLabel(code: string): string {
  const m = code.match(/ownership-of-shares-(\d+)-to-(\d+)-percent/);
  if (m) return `Owns ${m[1]}–${m[2]}% of shares`;
  const v = code.match(/voting-rights-(\d+)-to-(\d+)-percent/);
  if (v) return `${v[1]}–${v[2]}% of voting rights`;
  const known: Record<string, string> = {
    "right-to-appoint-and-remove-directors": "Can appoint / remove directors",
    "significant-influence-or-control": "Significant influence or control",
    "ownership-of-shares-75-to-100-percent-as-trust": "Trust owns 75–100% of shares",
    "ownership-of-shares-75-to-100-percent-as-firm": "Firm owns 75–100% of shares",
  };
  if (known[code]) return known[code];
  return code
    .replace(/-(registered-overseas-entity|limited-liability-partnership|as-trust|as-firm)$/, "")
    .replace(/-/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function pscKind(kind?: string): PSC["kind"] {
  if (!kind) return "individual";
  if (kind.includes("statement")) return "statement";
  if (kind.includes("corporate")) return "corporate";
  if (kind.includes("legal-person")) return "legal-person";
  return "individual";
}

export async function getPSCs(number: string): Promise<PSC[]> {
  try {
    const data = await chFetch<CHPscs>(`/company/${encodeURIComponent(number)}/persons-with-significant-control?items_per_page=25`);
    return (data.items || [])
      .filter((p) => p.kind !== "totals#persons-with-significant-control")
      .map((p) => ({
        name: p.name ? titleCaseName(p.name) : "Statement",
        kind: pscKind(p.kind),
        naturesOfControl: (p.natures_of_control || []).map(natureLabel),
        notifiedOn: p.notified_on,
        ceasedOn: p.ceased_on,
        nationality: p.nationality,
        countryOfResidence: p.country_of_residence,
        active: !p.ceased_on,
      }));
  } catch (e) {
    if (e instanceof CompaniesHouseError && e.status === 404) return [];
    throw e;
  }
}
