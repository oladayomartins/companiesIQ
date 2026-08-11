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
  // Prior-year comparatives (from the same accounts) — for the growth signal.
  prevPeriodEnd: string | null;
  prevTurnover: number | null;
  prevNetAssets: number | null;
  prevEmployees: number | null;
  source: string | null; // provenance label
  checkedAt: string;
}

export type GrowthTier = "Growing" | "Stable" | "Declining" | null;

/**
 * Year-on-year growth from the filed accounts' current vs prior period. A
 * derived SIGNAL from as-filed figures — not a verdict. null when there's no
 * comparable prior year. Turnover leads the tier; net worth is the fallback.
 */
export function financialGrowth(f: CompanyFinancials): { netWorthPct: number | null; turnoverPct: number | null; tier: GrowthTier } {
  const pct = (cur: number | null, prev: number | null): number | null => {
    if (cur == null || prev == null || prev === 0) return null;
    if (prev < 0) return cur > prev ? 100 : cur < prev ? -100 : 0; // sign-aware, capped
    return Math.round(((cur - prev) / prev) * 100);
  };
  const netWorthPct = pct(f.netAssets, f.prevNetAssets);
  const turnoverPct = pct(f.turnover, f.prevTurnover);
  const primary = turnoverPct != null ? turnoverPct : netWorthPct;
  const tier: GrowthTier = primary == null ? null : primary >= 10 ? "Growing" : primary <= -10 ? "Declining" : "Stable";
  return { netWorthPct, turnoverPct, tier };
}
