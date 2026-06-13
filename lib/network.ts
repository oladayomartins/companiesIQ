// ============================================================
// Director network — the 2-hop graph: company → its directors → the OTHER
// companies those directors run. Surfaces "connected companies" (shared a
// director) on the report. All factual, from Companies House officer
// appointments. Server-only; bounded + best-effort (a handful of directors).
// ============================================================
import "server-only";
import { getOfficerProfile } from "@/lib/data";
import type { Officer } from "@/lib/types";

export interface NetworkConnection {
  number: string;
  name: string;
  status?: string;
  sector?: string;
  viaDirectors: string[]; // which of this company's directors also sit on it
}

export interface DirectorNetwork {
  connections: NetworkConnection[];
  directorsChecked: number;
  totalOtherActive: number; // distinct other active companies the directors run
}

const MAX_DIRECTORS = 6; // bound the per-render officer-appointment calls

export async function getDirectorNetwork(officers: Officer[], currentNumber: string): Promise<DirectorNetwork> {
  // Active, individual directors with a resolvable officer id.
  const directors = officers
    .filter((o) => o.status === "active" && o.officerId && o.kind !== "company")
    .slice(0, MAX_DIRECTORS);
  if (!directors.length) return { connections: [], directorsChecked: 0, totalOtherActive: 0 };

  const byCompany = new Map<string, NetworkConnection>();

  await Promise.all(
    directors.map(async (d) => {
      try {
        const profile = await getOfficerProfile(d.officerId!);
        if (!profile) return;
        for (const a of profile.appointments) {
          if (!a.active || a.companyNumber === currentNumber) continue;
          const existing = byCompany.get(a.companyNumber);
          if (existing) {
            if (!existing.viaDirectors.includes(d.name)) existing.viaDirectors.push(d.name);
          } else {
            byCompany.set(a.companyNumber, {
              number: a.companyNumber,
              name: a.companyName,
              status: a.companyStatus,
              sector: a.sector,
              viaDirectors: [d.name],
            });
          }
        }
      } catch {
        /* skip this director on error */
      }
    })
  );

  // Companies linked by more directors first, then by name.
  const connections = Array.from(byCompany.values()).sort(
    (a, b) => b.viaDirectors.length - a.viaDirectors.length || a.name.localeCompare(b.name)
  );

  return { connections, directorsChecked: directors.length, totalOtherActive: connections.length };
}
