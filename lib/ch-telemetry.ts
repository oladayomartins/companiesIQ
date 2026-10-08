// ============================================================
// Companies House call telemetry — who is spending the shared key's quota.
//
// The key (600 requests / 5 min) has been drained to zero in the minutes after
// several deploys, and the runtime logs couldn't say by what: they only hold
// lines the app prints. This counts every Companies House call made through
// lib/companies-house.ts and prints one JSON summary per instance per minute,
// plus an immediate "burst" line when one instance passes BURST calls in a
// minute (requests actually sent), plus a final line when a build exits. Search the Vercel
// logs for "[ch-telemetry]".
//
// Counters and console.info only: nothing leaves the process, no request data
// beyond route names and endpoint shapes (company numbers are masked).
// Pure apart from the console, with an injectable clock for tests.
// ============================================================

export const FLUSH_MS = 60_000;
export const BURST = 60;

export type Outcome = "ok" | "cached" | "not_found" | "rate_limited" | "deferred" | "error";

export interface CallRecord {
  caller: string;
  endpoint: string;
  priority: "high" | "low";
  outcome: Outcome;
  remain: number | null;
}

/** "/company/12345678/officers?x" → "/company/{n}/officers"; "/advanced-search/companies?…" → "/advanced-search/companies". */
export function endpointShape(path: string): string {
  const p = path.split("?")[0];
  return p
    .replace(/^\/company\/[^/]+/, "/company/{n}")
    .replace(/^\/officers\/[^/]+/, "/officers/{id}")
    .replace(/^\/document\/[^/]+/, "/document/{id}");
}

/**
 * The route that made the call, read from a stack trace. Compiled server
 * chunks keep the route in their path (".next/server/app/company/[number]/
 * page.js"), so the first app/… or pages/api/… frame names the caller. Falls
 * back to the first lib/ or scripts/ frame, then "unknown".
 */
export function callerFromStack(stack: string | undefined): string {
  if (!stack) return "unknown";
  const lines = stack.split("\n").slice(1);
  for (const l of lines) {
    const m = l.match(/[/\\]app([/\\][^:)]*?)[/\\](page|route|layout|opengraph-image|twitter-image|sitemap|robots|icon)[^/\\]*\.(?:js|ts|tsx|mjs)/);
    if (m) return `app${m[1].replace(/\\/g, "/")}/${m[2]}`;
  }
  for (const l of lines) {
    if (/ch-telemetry|companies-house/.test(l)) continue;
    const m = l.match(/[/\\]((?:lib|scripts)[/\\][^:)]+?)\.(?:js|ts|tsx|mjs|mts)/);
    if (m) return m[1].replace(/\\/g, "/");
  }
  return "unknown";
}

type Counts = Record<string, number>;
const bump = (c: Counts, k: string) => (c[k] = (c[k] ?? 0) + 1);

export class Telemetry {
  private started: number;
  private total = 0;
  private byCaller: Counts = {};
  private byEndpoint: Counts = {};
  private byOutcome: Counts = {};
  private byPriority: Counts = {};
  private minRemain: number | null = null;
  private burstLogged = false;

  constructor(
    private readonly meta: Record<string, string | undefined>,
    private readonly log: (line: string) => void = (l) => console.info(l),
    private readonly now: () => number = Date.now
  ) {
    this.started = now();
  }

  record(r: CallRecord): void {
    if (this.now() - this.started >= FLUSH_MS) this.flush("minute");
    this.total++;
    bump(this.byCaller, r.caller);
    bump(this.byEndpoint, r.endpoint);
    bump(this.byOutcome, r.outcome);
    bump(this.byPriority, r.priority);
    if (r.remain != null) this.minRemain = this.minRemain == null ? r.remain : Math.min(this.minRemain, r.remain);
    const sent = this.total - (this.byOutcome.deferred ?? 0) - (this.byOutcome.cached ?? 0);
    if (!this.burstLogged && sent >= BURST) {
      this.burstLogged = true;
      this.emit("burst");
    }
  }

  /** Print the window's summary (if any calls) and start a new one. */
  flush(reason: "minute" | "exit" | "burst"): void {
    if (this.total > 0) this.emit(reason);
    this.started = this.now();
    this.total = 0;
    this.byCaller = {};
    this.byEndpoint = {};
    this.byOutcome = {};
    this.byPriority = {};
    this.minRemain = null;
    this.burstLogged = false;
  }

  private emit(reason: string): void {
    const top = (c: Counts, n = 8) =>
      Object.fromEntries(Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n));
    this.log(
      "[ch-telemetry] " +
        JSON.stringify({
          reason,
          ...this.meta,
          windowSec: Math.round((this.now() - this.started) / 1000),
          calls: this.total,
          // Requests that actually reached Companies House (refused and
          // cache-replayed calls cost no quota).
          sent: this.total - (this.byOutcome.deferred ?? 0) - (this.byOutcome.cached ?? 0),
          minRemain: this.minRemain,
          outcome: this.byOutcome,
          priority: this.byPriority,
          callers: top(this.byCaller),
          endpoints: top(this.byEndpoint),
        })
    );
  }
}

/** Process-wide instance; meta identifies the deployment, phase and instance. */
export const telemetry = new Telemetry({
  phase: typeof process !== "undefined" ? process.env.NEXT_PHASE ?? "runtime" : "runtime",
  deployment: typeof process !== "undefined" ? process.env.VERCEL_DEPLOYMENT_ID?.slice(-8) : undefined,
  region: typeof process !== "undefined" ? process.env.VERCEL_REGION : undefined,
  instance: Math.random().toString(36).slice(2, 8),
});

// A build worker exits without another call to trigger the minute flush, so
// print what it spent on the way out (console is synchronous at exit).
if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("exit", () => telemetry.flush("exit"));
}

/** A stack deep enough to reach the route frame (Node keeps 10 by default). */
export function captureStack(): string | undefined {
  const prev = Error.stackTraceLimit;
  Error.stackTraceLimit = 40;
  try {
    return new Error().stack;
  } finally {
    Error.stackTraceLimit = prev;
  }
}
