// Period arithmetic for research studies.
//
// A period is only reportable once it has fully elapsed AND the register has
// had time to settle. Companies House publishes incorporations a few days in
// arrears and late registrations continue to trickle in, so we hold a closed
// period back by PUBLICATION_LAG_DAYS before reporting on it. Reporting a
// half-year on 1 July would systematically understate June.
import type { Period } from "./types";

export const PUBLICATION_LAG_DAYS = 21;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function halfPeriod(year: number, half: 1 | 2): Period {
  const from = half === 1 ? `${year}-01-01` : `${year}-07-01`;
  const to = half === 1 ? `${year}-06-30` : `${year}-12-31`;
  return {
    id: `h${half}-${year}`,
    label: `H${half} ${year}`,
    longLabel: half === 1 ? `the first half of ${year}` : `the second half of ${year}`,
    from,
    to,
  };
}

export function quarterPeriod(year: number, q: 1 | 2 | 3 | 4): Period {
  const startMonth = (q - 1) * 3;
  const from = new Date(Date.UTC(year, startMonth, 1));
  const to = new Date(Date.UTC(year, startMonth + 3, 0));
  return { id: `q${q}-${year}`, label: `Q${q} ${year}`, longLabel: `the ${["first", "second", "third", "fourth"][q - 1]} quarter of ${year}`, from: iso(from), to: iso(to) };
}

/** True once a period has ended and the publication lag has passed. */
export function isSettled(p: Period, now: Date): boolean {
  const end = new Date(p.to + "T00:00:00Z").getTime();
  return now.getTime() >= end + PUBLICATION_LAG_DAYS * 86_400_000;
}

/** The most recent settled halves, newest first. */
export function settledHalves(now: Date, count = 3): Period[] {
  const out: Period[] = [];
  let year = now.getUTCFullYear();
  let half: 1 | 2 = now.getUTCMonth() < 6 ? 1 : 2;
  while (out.length < count) {
    const p = halfPeriod(year, half);
    if (isSettled(p, now)) out.push(p);
    if (half === 1) {
      half = 2;
      year -= 1;
    } else {
      half = 1;
    }
    if (year < 2015) break;
  }
  return out;
}

/** The most recent settled quarters, newest first. */
export function settledQuarters(now: Date, count = 4): Period[] {
  const out: Period[] = [];
  let year = now.getUTCFullYear();
  let q = (Math.floor(now.getUTCMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  while (out.length < count) {
    const p = quarterPeriod(year, q);
    if (isSettled(p, now)) out.push(p);
    if (q === 1) {
      q = 4;
      year -= 1;
    } else {
      q = (q - 1) as 1 | 2 | 3 | 4;
    }
    if (year < 2015) break;
  }
  return out;
}

/** The same period one year earlier — the comparison every study uses. */
export function yearEarlier(p: Period): Period {
  const y = Number(p.id.slice(-4)) - 1;
  if (p.id.startsWith("h")) return halfPeriod(y, Number(p.id[1]) as 1 | 2);
  return quarterPeriod(y, Number(p.id[1]) as 1 | 2 | 3 | 4);
}

/** Calendar months inside a period, as label + inclusive date range. */
export function monthsIn(p: Period): { label: string; from: string; to: string }[] {
  const start = new Date(p.from + "T00:00:00Z");
  const end = new Date(p.to + "T00:00:00Z");
  const out: { label: string; from: string; to: string }[] = [];
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cur <= end) {
    const mEnd = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 0));
    out.push({
      label: MONTHS[cur.getUTCMonth()].slice(0, 3),
      from: iso(cur),
      to: iso(mEnd < end ? mEnd : end),
    });
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return out;
}
