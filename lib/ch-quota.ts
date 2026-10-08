// ============================================================
// Companies House quota guard — keep background counts from starving the
// requests that render company pages.
//
// One API key serves everything, and its limit is 600 requests per 5 minutes
// across ALL server instances. On 2026-10-08 sector counts and trends (#56)
// used it up and uncached /company/[number] pages fell back to "the register
// is busy". Instances share no memory, but every Companies House response
// carries the key's own remaining budget (x-ratelimit-remain / -reset), so
// each instance always knows the global position as of its last call.
//
// Two priorities:
//   high  company lookups, on-site search — always sent
//   low   aggregate counts (sector trends, market summaries) — sent only while
//         the window has more than LOW_RESERVE requests left, at most
//         LOW_CONCURRENCY at a time per instance; otherwise refused at once,
//         without spending a request. Callers already treat a failed count as
//         "no number" and fall back (labelled estimate, or no chart).
//
// Pure: no I/O, no server-only import, so it can be unit-tested directly.
// ============================================================

/** Requests kept back for high-priority work in every 5-minute window.
 *  Tunable without a code change: CH_LOW_RESERVE (0–600). */
export const LOW_RESERVE = (() => {
  const v = Number(typeof process !== "undefined" ? process.env.CH_LOW_RESERVE : undefined);
  return Number.isFinite(v) && v >= 0 && v <= 600 ? v : 250;
})();
/** Low-priority requests one instance may have in flight. */
export const LOW_CONCURRENCY = 6;

export type Priority = "high" | "low";

interface Reading {
  remain: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
}

export class QuotaGuard {
  private reading: Reading | null = null;
  private lowInFlight = 0;
  private waiters: (() => void)[] = [];
  private lastWarn = 0;

  constructor(
    private readonly reserve = LOW_RESERVE,
    private readonly concurrency = LOW_CONCURRENCY,
    private readonly now: () => number = Date.now
  ) {}

  /**
   * Record the budget from a response. Ignores readings for a window that has
   * already reset — those come from cached responses and say nothing about now.
   */
  observe(remain: number | null, resetEpochSeconds: number | null): void {
    if (remain == null || resetEpochSeconds == null || !Number.isFinite(remain)) return;
    const resetAt = resetEpochSeconds * 1000;
    if (resetAt <= this.now()) return;
    // Within one window the budget only falls; keep the lowest we've seen.
    if (this.reading && this.reading.resetAt === resetAt) {
      this.reading = { remain: Math.min(this.reading.remain, remain), resetAt };
    } else {
      this.reading = { remain, resetAt };
    }
  }

  /** A 429: nothing left until the reset (or a minute, if it didn't say). */
  exhausted(resetEpochSeconds: number | null): void {
    const resetAt = resetEpochSeconds ? resetEpochSeconds * 1000 : this.now() + 60_000;
    this.reading = { remain: 0, resetAt };
  }

  /**
   * May low-priority work costing `cost` requests start now? A multi-request
   * job (a 12-quarter trend) checks its whole cost up front, so it never spends
   * half its requests and then gets refused with nothing to show for them.
   */
  allowsLow(cost = 1): boolean {
    const r = this.reading;
    if (!r || r.resetAt <= this.now()) return true; // unknown or stale: the window has reset
    return r.remain - cost >= this.reserve;
  }

  /** Remaining budget as last seen (null = unknown). For logs only. */
  remaining(): number | null {
    const r = this.reading;
    return r && r.resetAt > this.now() ? r.remain : null;
  }

  /** Wait for a low-priority slot; returns the release function. */
  async acquireLow(): Promise<() => void> {
    if (this.lowInFlight >= this.concurrency) {
      // The releasing request hands its slot straight to us (the count stays
      // put), so a newcomer can't slip in between and exceed the cap.
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    } else {
      this.lowInFlight++;
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = this.waiters.shift();
      if (next) next();
      else this.lowInFlight--;
    };
  }

  /** Throttled to one log line a minute so a busy window can't flood the logs. */
  shouldWarn(): boolean {
    if (this.now() - this.lastWarn < 60_000) return false;
    this.lastWarn = this.now();
    return true;
  }
}

/** The instance-wide guard used by lib/companies-house.ts. */
export const quota = new QuotaGuard();
