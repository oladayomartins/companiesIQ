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
import { quota, type Priority } from "./ch-quota";

const BASE = "https://api.company-information.service.gov.uk";

/** Why a Companies House call failed. Callers branch on this rather than on
 *  the message: "we are misconfigured" and "the register is busy" look the
 *  same to a fetch but must not read the same to a visitor. */
export type CompaniesHouseErrorKind = "unconfigured" | "not_found" | "rate_limited" | "upstream" | "deferred";

export class CompaniesHouseError extends Error {
  status: number;
  kind: CompaniesHouseErrorKind;
  constructor(message: string, status: number, kind: CompaniesHouseErrorKind = "upstream") {
    super(message);
    this.name = "CompaniesHouseError";
    this.status = status;
    this.kind = kind;
  }
}

export function hasApiKey(): boolean {
  return !!process.env.COMPANIES_HOUSE_API_KEY;
}

/**
 * One Companies House GET. `priority: "low"` marks aggregate work (sector
 * counts, trends, market summaries) that must never starve company lookups:
 * it is refused — without spending a request — once the key's 5-minute budget
 * drops to the reserve, and limited in concurrency. See lib/ch-quota.ts.
 */
async function chFetch<T>(path: string, init?: RequestInit, requested: Priority = "high"): Promise<T> {
  // During `next build` (every deploy) ~290 pages are pre-rendered from the
  // register. That burst shares the live site's quota, so ALL build-time calls
  // are low priority: a deploy can never eat the reserve that company pages
  // need. Every pre-rendered page already renders a fallback when a call fails,
  // and ISR refreshes it at runtime.
  const priority: Priority = process.env.NEXT_PHASE === "phase-production-build" ? "low" : requested;
  if (priority === "low") {
    if (!quota.allowsLow()) throw deferred();
    const release = await quota.acquireLow();
    try {
      // The budget may have fallen while this call waited for a slot.
      if (!quota.allowsLow()) throw deferred();
      return await chFetchNow<T>(path, init);
    } finally {
      release();
    }
  }
  return chFetchNow<T>(path, init);
}

/** Can low-priority work needing about `cost` requests start now? */
export function canAffordLow(cost: number): boolean {
  if (quota.allowsLow(cost)) return true;
  if (quota.shouldWarn()) {
    console.warn(`[companies-house] deferring a ${cost}-request job: ${quota.remaining()} left in this window, reserve kept for company lookups`);
  }
  return false;
}

/** Requests countCompaniesAcross will make for these params (one per SIC chunk). */
export function requestsFor(params: AdvancedSearchParams): number {
  return (params.sicCodes ?? []).length ? chunkSicCodes({ ...params, size: 1 }).length : 1;
}

function deferred(): CompaniesHouseError {
  if (quota.shouldWarn()) {
    console.warn(`[companies-house] deferring low-priority requests: ${quota.remaining()} left in this window, reserve kept for company lookups`);
  }
  return new CompaniesHouseError("Deferred to protect the Companies House quota.", 429, "deferred");
}

const headerNum = (res: Response, name: string): number | null => {
  const v = res.headers.get(name);
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
};

async function chFetchNow<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) {
    // The fix is ours, not the visitor's — the env var name and where to get a
    // key belong in the server log, never in the page.
    console.error(
      "[companies-house] COMPANIES_HOUSE_API_KEY is not set. Add a free key from developer.company-information.service.gov.uk"
    );
    throw new CompaniesHouseError("Companies House is not configured.", 503, "unconfigured");
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
  // Every live response carries the key's remaining budget — the one signal
  // all server instances share. (Cached responses carry an expired window,
  // which the guard ignores.)
  if (res.status === 429) {
    quota.exhausted(headerNum(res, "x-ratelimit-reset"));
    throw new CompaniesHouseError("Rate limited by Companies House — try again shortly.", 429, "rate_limited");
  }
  quota.observe(headerNum(res, "x-ratelimit-remain"), headerNum(res, "x-ratelimit-reset"));
  if (res.status === 404) throw new CompaniesHouseError("Not found", 404, "not_found");
  if (!res.ok) throw new CompaniesHouseError(`Companies House returned ${res.status}`, res.status, "upstream");
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
      name: titleCaseName(it.title, { acronyms: true }),
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
  /** Not a query param — "low" for aggregate counts (see chFetch). */
  priority?: Priority;
}

/** One page of search results plus the register's total for the query. */
export interface SearchResultPage {
  total: number;
  results: SearchResult[];
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

  // The advanced-search endpoint returns 404 (not an empty 200) when a filter
  // matches zero companies — which happens routinely for narrow recent windows,
  // since the register lags real-world incorporations by a few days. Treat that
  // as an empty result set rather than an error, so the dashboard renders a real
  // zero instead of a "Not found" page.
  let data: CHAdvancedResponse;
  try {
    data = await chFetch<CHAdvancedResponse>(`/advanced-search/companies?${qs.toString()}`, undefined, params.priority);
  } catch (e) {
    if (e instanceof CompaniesHouseError && e.status === 404) return { total: 0, results: [] };
    throw e;
  }
  const results: SearchResult[] = (data.items || []).map((it) => {
    const geo = resolveGeo({ postcode: it.registered_office_address?.postal_code, locality: it.registered_office_address?.locality });
    const primary = it.sic_codes?.[0];
    return {
      number: it.company_number,
      name: titleCaseName(it.company_name, { acronyms: true }),
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

// Companies House's edge rejects long advanced-search URLs with a 403.
// Measured 2026-10-08: 2,119 chars passed, 2,215 failed. Stay under 2,000.
const MAX_SEARCH_URL = 2000;

/**
 * countCompanies for any number of SIC codes. A code list is OR — a company
 * matching several codes counts once — so when the list fits one URL the total
 * is exact. Longer lists are packed into as few URL-sized requests as possible
 * and summed; a company listing codes from two different chunks is then
 * counted twice (measured at ~2% for Manufacturing, the only sector that needs
 * splitting). Codes stay in order, so related divisions share a chunk.
 */
/** Split a SIC list into as few URL-sized groups as the other params allow (order kept). */
function chunkSicCodes(params: AdvancedSearchParams): string[][] {
  const codes = params.sicCodes ?? [];
  const other = { ...params, sicCodes: [] as string[] };
  const fixed =
    BASE.length +
    "/advanced-search/companies?".length +
    // Every non-SIC param the request will carry, measured the way advancedSearch encodes it.
    [
      other.q && `company_name_includes=${encodeURIComponent(other.q)}`,
      ...(other.status ?? []).map((v) => `company_status=${v}`),
      ...(other.companyType ?? []).map((v) => `company_type=${v}`),
      other.location && `location=${encodeURIComponent(other.location)}`,
      other.incorporatedFrom && `incorporated_from=${other.incorporatedFrom}`,
      other.incorporatedTo && `incorporated_to=${other.incorporatedTo}`,
      other.dissolvedFrom && `dissolved_from=${other.dissolvedFrom}`,
      other.dissolvedTo && `dissolved_to=${other.dissolvedTo}`,
      `size=${other.size ?? 40}`,
      other.startIndex && `start_index=${other.startIndex}`,
    ]
      .filter(Boolean)
      .join("&").length +
    16;
  const room = MAX_SEARCH_URL - fixed;
  const chunks: string[][] = [];
  let cur: string[] = [];
  let len = 0;
  for (const c of codes) {
    const add = `&sic_codes=${c}`.length;
    if (cur.length && len + add > room) {
      chunks.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(c);
    len += add;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

export async function countCompaniesAcross(params: AdvancedSearchParams): Promise<{ total: number; requests: number }> {
  if (!(params.sicCodes ?? []).length) return { total: await countCompanies(params), requests: 1 };
  const chunks = chunkSicCodes({ ...params, size: 1 });
  const totals = await Promise.all(chunks.map((sicCodes) => countCompanies({ ...params, sicCodes })));
  return { total: totals.reduce((t, n) => t + n, 0), requests: chunks.length };
}

/**
 * advancedSearch for any number of SIC codes. One request when the list fits
 * (exact). Otherwise the chunks are treated as one list laid end to end: each
 * chunk is counted, `startIndex` is mapped into the right chunk, and a page
 * that crosses a boundary is filled from the next. The total matches
 * countCompaniesAcross (same ~2% double-count caveat).
 */
export async function advancedSearchAcross(params: AdvancedSearchParams): Promise<{ total: number; results: SearchResult[]; split: boolean }> {
  const chunks = (params.sicCodes ?? []).length ? chunkSicCodes(params) : [params.sicCodes ?? []];
  if (chunks.length <= 1) return { ...(await advancedSearch(params)), split: false };
  const totals = await Promise.all(chunks.map((sicCodes) => countCompanies({ ...params, sicCodes, startIndex: undefined })));
  const total = totals.reduce((t, n) => t + n, 0);
  const size = params.size ?? 40;
  let start = params.startIndex ?? 0;
  const results: SearchResult[] = [];
  for (let k = 0; k < chunks.length && results.length < size; k++) {
    if (start >= totals[k]) {
      start -= totals[k];
      continue;
    }
    const page = await advancedSearch({ ...params, sicCodes: chunks[k], startIndex: start, size: size - results.length });
    results.push(...page.results);
    start = 0;
  }
  return { total, results, split: true };
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
    name: titleCaseName(p.company_name, { acronyms: true }),
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
      companyName: titleCaseName(a.appointed_to?.company_name || "", { acronyms: true }),
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
