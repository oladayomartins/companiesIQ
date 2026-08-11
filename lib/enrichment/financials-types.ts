// Client-safe financials type (no server deps) so the report card can import it.

/**
 * Financials parsed from a company's latest filed accounts (iXBRL) at Companies
 * House. Evidence-first: each figure is an as-filed value for the stated period,
 * or null = "Not Assessed" (no machine-readable accounts, or the concept wasn't
 * tagged). Values are whole GBP, as filed — a signal, not an audited verdict.
 */
export interface CompanyFinancials {
  companyNumber: string;
  assessed: boolean; // true when machine-readable accounts were found + parsed
  accountsType: string | null; // full | small | micro-entity | dormant | ...
  periodEnd: string | null; // the accounts' made-up-to / period-end date
  filedOn: string | null; // filing date at Companies House
  turnover: number | null;
  netAssets: number | null; // net worth
  cash: number | null;
  employees: number | null;
  source: string | null; // provenance label
  checkedAt: string;
}
