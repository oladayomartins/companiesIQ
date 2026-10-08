// ============================================================
// How long each Companies House response may be served from Next's shared
// data cache.
//
// The key allows 600 requests / 5 min and crawlers can outrun it (telemetry,
// 2026-10-08). Next's fetch cache is shared by every server instance and
// serves stale-while-revalidate: once an entry expires, the next request gets
// the stale copy at once and ONE background fetch refreshes it. So an entry
// costs at most one Companies House call per window, whatever the traffic.
//
// Windows follow how often each record actually changes. The register is
// updated daily, so nothing here is held longer than a working morning:
//   profile, filing history   1h   status, accounts dates, new filings
//   officers, PSCs, charges   6h   appointments/control/charges change rarely
//   officer appointments      6h
//   similar-company lookups   6h   one search per SIC code, shared by every
//                                  company in that industry (caller opts in)
//   searches                  5m   people expect fresh results
// Pure, no imports: unit-tested in scripts/test-ch-cache-policy.mjs.
// ============================================================

export const MINUTES = 60;
export const HOUR = 60 * MINUTES;

/** Cache window in seconds for a Companies House API path (with query). */
export function cacheSecondsFor(path: string): number {
  const p = path.split("?")[0];
  if (/^\/company\/[^/]+$/.test(p)) return HOUR;
  if (/^\/company\/[^/]+\/filing-history$/.test(p)) return HOUR;
  if (/^\/company\/[^/]+\/(officers|persons-with-significant-control|charges)$/.test(p)) return 6 * HOUR;
  if (/^\/officers\/[^/]+\/appointments$/.test(p)) return 6 * HOUR;
  // Searches (name search, advanced search) — fresh unless the caller asks
  // for longer via AdvancedSearchParams.cacheSeconds.
  return 5 * MINUTES;
}
