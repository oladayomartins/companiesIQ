// Formatting helpers. Numbers are first-class in CompaniesIQ —
// always tabular, always real. These keep figures consistent.

export function fmtNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-GB");
}

export function fmtPercent(n: number | null | undefined, dp = 1): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toFixed(dp)}%`;
}

export function fmtDelta(n: number | null | undefined, dp = 1): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(dp)}%`;
}

/** Companies House dates arrive as YYYY-MM-DD; present them readably. */
export function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function daysSince(iso?: string, now = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (24 * 3600 * 1000)));
}

export function yearsSince(iso?: string, now = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000)));
}

export function ageLabel(iso?: string): string {
  const y = yearsSince(iso);
  return y == null ? "—" : `${y} yr${y === 1 ? "" : "s"}`;
}

/** Title-cases Companies House SHOUTING names while keeping LTD/PLC etc. */
const KEEP_UPPER = new Set(["LTD", "PLC", "LLP", "LP", "UK", "CIC", "CIO", "C.I.C."]);
export function titleCaseName(name: string): string {
  if (!name) return name;
  // Only transform if the name is mostly uppercase (CH returns SHOUTING).
  const letters = name.replace(/[^A-Za-z]/g, "");
  const upper = name.replace(/[^A-Z]/g, "").length;
  if (!letters.length || upper / letters.length < 0.7) return name;
  return name
    .toLowerCase()
    .split(/\b/)
    .map((w) => {
      const u = w.toUpperCase();
      if (KEEP_UPPER.has(u)) return u;
      return w.replace(/^[a-z]/, (c) => c.toUpperCase());
    })
    .join("");
}
