// ============================================================
// Director network — the 2-hop graph: company → its directors → the OTHER
// companies those directors run. Surfaces "connected companies" (shared a
// director) on the report. All factual, from Companies House officer
// appointments. Cached on the company's register-cache row (write-through),
// so a repeat unlocked report makes 0 CH calls instead of ~6.
// ============================================================
import "server-only";
import { getOfficerProfile } from "@/lib/data";
import { getSupabaseAdmin } from "@/lib/supabase/server";
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
const NETWORK_TTL_DAYS = 7;

function isFresh(iso: string | null, days: number): boolean {
  if (!iso) return false;
  return Date.now() - Date.parse(iso) < days * 86_400_000;
}

export async function getDirectorNetwork(
  officers: Officer[],
  currentNumber: string,
  companyName?: string
): Promise<DirectorNetwork> {
  // Active, individual directors with a resolvable officer id.
  const directors = officers
    .filter((o) => o.status === "active" && o.officerId && o.kind !== "company")
    .slice(0, MAX_DIRECTORS);
  const directorsChecked = directors.length;
  if (!directorsChecked) return { connections: [], directorsChecked: 0, totalOtherActive: 0 };

  const admin = getSupabaseAdmin();

  // 1. Cache hit → no Companies House calls.
  if (admin) {
    try {
      const { data } = await admin
        .from("companies")
        .select("director_network,network_checked_at")
        .eq("number", currentNumber)
        .maybeSingle();
      if (data && isFresh(data.network_checked_at as string, NETWORK_TTL_DAYS) && Array.isArray(data.director_network)) {
        const connections = data.director_network as NetworkConnection[];
        return { connections, directorsChecked, totalOtherActive: connections.length };
      }
    } catch {
      /* cache miss / not configured → compute live */
    }
  }

  // 2. Compute live from officer appointments.
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

  const connections = Array.from(byCompany.values()).sort(
    (a, b) => b.viaDirectors.length - a.viaDirectors.length || a.name.localeCompare(b.name)
  );

  // 3. Write through to the company's cache row (best-effort).
  if (admin) {
    try {
      await admin.from("companies").upsert(
        {
          number: currentNumber,
          name: companyName ?? currentNumber,
          director_network: connections,
          network_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "number" }
      );
    } catch {
      /* best-effort */
    }
  }

  return { connections, directorsChecked, totalOtherActive: connections.length };
}
