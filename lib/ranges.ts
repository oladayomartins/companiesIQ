// Date-range options for the dashboard selector (client-safe — no server-only deps).
export const RANGES: { id: string; label: string; short: string; days: number }[] = [
  { id: "24h", label: "Last 24 hours", short: "24h", days: 1 },
  { id: "7d", label: "Last 7 days", short: "7d", days: 7 },
  { id: "30d", label: "Last 30 days", short: "30d", days: 30 },
];

export const DEFAULT_RANGE = "30d";

export function rangeDays(id?: string): { id: string; label: string; days: number } {
  const r = RANGES.find((x) => x.id === id) || RANGES.find((x) => x.id === DEFAULT_RANGE)!;
  return { id: r.id, label: r.label, days: r.days };
}

export interface ResolvedRange {
  id: string; // preset id or "custom"
  label: string; // human label, e.g. "Last 30 days" or "1 Apr – 30 Apr"
  days: number; // window length in days
  to?: string; // ISO end anchor (omitted = today)
  from?: string; // ISO start (custom only)
  custom: boolean;
}

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Resolve the dashboard window from URL params. A custom `from`/`to` pair takes
 * precedence over a preset `range`. Client-safe (plain date math, no server deps).
 */
export function resolveRange(p: { range?: string; from?: string; to?: string }): ResolvedRange {
  if (p.from && p.to) {
    const from = p.from < p.to ? p.from : p.to;
    const to = p.from < p.to ? p.to : p.from;
    const days = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86400000));
    return { id: "custom", label: `${shortDate(from)} – ${shortDate(to)}`, days, from, to, custom: true };
  }
  const r = RANGES.find((x) => x.id === p.range) || RANGES.find((x) => x.id === DEFAULT_RANGE)!;
  return { id: r.id, label: r.label, days: r.days, custom: false };
}
