// Date-range options for the dashboard selector (client-safe — no server-only deps).
export const RANGES: { id: string; label: string; short: string; days: number }[] = [
  { id: "24h", label: "Last 24 hours", short: "24h", days: 1 },
  { id: "7d", label: "Last 7 days", short: "7d", days: 7 },
  { id: "30d", label: "Last 30 days", short: "30d", days: 30 },
  { id: "90d", label: "Last 90 days", short: "90d", days: 90 },
  { id: "12m", label: "Last 12 months", short: "12m", days: 365 },
];

export const DEFAULT_RANGE = "30d";

export function rangeDays(id?: string): { id: string; label: string; days: number } {
  const r = RANGES.find((x) => x.id === id) || RANGES.find((x) => x.id === DEFAULT_RANGE)!;
  return { id: r.id, label: r.label, days: r.days };
}
