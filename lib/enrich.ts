// ============================================================
// Enrich-my-list — take a list of company numbers and return each one scored,
// with filing status, owner nationality and the core facts. Reuses the live
// Companies House client + the opportunity engine. Bounded (cap + concurrency)
// to respect rate limits.
// ============================================================
import "server-only";
import * as ch from "@/lib/companies-house";
import { buildOpportunity } from "@/lib/opportunity";

export interface EnrichedRow {
  number: string;
  found: boolean;
  name: string | null;
  status: string | null;
  type: string | null;
  incorporated: string | null;
  sector: string | null;
  region: string | null;
  accountsNextDue: string | null;
  accountsOverdue: boolean | null;
  confirmationNextDue: string | null;
  confirmationOverdue: boolean | null;
  ownerNationalities: string[];
  score: number | null;
}

export const ENRICH_MAX = 50;

/** Pull UK company numbers out of arbitrary pasted/CSV text. */
export function extractNumbers(text: string): string[] {
  const matches = text.toUpperCase().match(/\b([A-Z]{2}\d{6}|\d{8}|[A-Z]{2}\d{5}[A-Z0-9])\b/g) ?? [];
  return Array.from(new Set(matches));
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return out;
}

function empty(number: string): EnrichedRow {
  return {
    number,
    found: false,
    name: null,
    status: null,
    type: null,
    incorporated: null,
    sector: null,
    region: null,
    accountsNextDue: null,
    accountsOverdue: null,
    confirmationNextDue: null,
    confirmationOverdue: null,
    ownerNationalities: [],
    score: null,
  };
}

export async function enrichNumbers(rawNumbers: string[]): Promise<{ rows: EnrichedRow[]; processed: number; capped: boolean }> {
  const numbers = Array.from(new Set(rawNumbers.map((n) => n.trim().toUpperCase()).filter(Boolean)));
  const capped = numbers.length > ENRICH_MAX;
  const slice = numbers.slice(0, ENRICH_MAX);

  const rows = await mapPool(slice, 4, async (number): Promise<EnrichedRow> => {
    try {
      const [c, pscs] = await Promise.all([ch.getCompany(number), ch.getPSCs(number).catch(() => [])]);
      const nats = Array.from(new Set(pscs.filter((p) => p.active && p.nationality).map((p) => p.nationality as string)));
      // Compliance-based score (no Places lookup, to keep this rate-friendly).
      const opp = buildOpportunity(c, { directors: 0, pscs: nats.length, charges: 0 }, null);
      return {
        number,
        found: true,
        name: c.name,
        status: c.status,
        type: c.type ?? null,
        incorporated: c.incorporated ?? null,
        sector: c.primaryClassification?.sector ?? null,
        region: c.geo?.region && c.geo.region !== "Unknown" ? c.geo.region : null,
        accountsNextDue: c.accounts?.nextDue ?? null,
        accountsOverdue: c.accounts?.overdue ?? null,
        confirmationNextDue: c.confirmationStatement?.nextDue ?? null,
        confirmationOverdue: c.confirmationStatement?.overdue ?? null,
        ownerNationalities: nats,
        score: opp.score,
      };
    } catch {
      return empty(number);
    }
  });

  return { rows, processed: slice.length, capped };
}
