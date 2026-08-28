// ============================================================
// Metered free access to the company report.
//
// Google's flexible-sampling guidance prefers METERING over a hard lead-in
// gate: let a visitor read a few full pages, then ask. It reads better for a
// search visitor — landing on a blur is the fastest way back to the SERP — and
// it gives the account ask a reason ("you've used your free reports") instead
// of demanding one before anything has been shown.
//
// Deliberately cookie-based and anonymous: no account, no identifier, nothing
// stored server-side. The cookie holds a month and a count and nothing else, so
// it is not a profile and needs no consent banner.
//
// The meter never changes what a CRAWLER sees. The gated markup is in the DOM
// either way, and the paywall declaration
// (isAccessibleForFree/hasPart) already tells Google the section is gated —
// metering only decides whether a human is shown the blur.
// ============================================================

export const METER_COOKIE = "ciq_meter";
/** Full reports a logged-out visitor may read per calendar month. */
export const METER_ALLOWANCE = 3;

export interface MeterState {
  month: string;
  count: number;
}

const month = () => new Date().toISOString().slice(0, 7);

/** Parse the cookie, treating anything unexpected as a fresh month. */
export function readMeter(raw: string | undefined): MeterState {
  const now = month();
  if (!raw) return { month: now, count: 0 };
  const [m, c] = raw.split(":");
  if (m !== now) return { month: now, count: 0 }; // rolled over
  const n = Number(c);
  return { month: now, count: Number.isFinite(n) && n >= 0 ? n : 0 };
}

export const serialiseMeter = (s: MeterState) => `${s.month}:${s.count}`;

/** Has this visitor got a free read left? */
export const meterAllows = (s: MeterState) => s.count < METER_ALLOWANCE;

/** How many remain, for the "1 of 3 left" line. */
export const meterRemaining = (s: MeterState) => Math.max(0, METER_ALLOWANCE - s.count);
