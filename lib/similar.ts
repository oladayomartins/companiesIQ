// Shared "similar companies" lookup — same primary SIC, same-region first,
// excluding the subject. Used by the standard report and the founder funnel.
import "server-only";
import { explore } from "./data";
import type { SimilarCompany } from "./analytics";

export async function getSimilarCompanies(
  number: string,
  sic: string | undefined,
  region: string | undefined,
  // The report's peer table and score distribution need more than a handful to
  // be worth drawing; the underlying query already fetches 60 either way, so a
  // larger limit costs nothing extra.
  limit = 6
): Promise<SimilarCompany[]> {
  if (!sic) return [];
  try {
    const r = await explore({ sicCodes: [sic], status: ["active"], size: 60 });
    const others = r.results.filter((x) => x.number !== number);
    const inRegion = region && region !== "Unknown" ? others.filter((x) => x.region === region) : [];
    const rest = others.filter((x) => !inRegion.includes(x));
    return [...inRegion, ...rest]
      .slice(0, Math.max(1, limit))
      .map((x) => ({ number: x.number, name: x.name, sicCode: x.sicCodes[0], region: x.region, incorporated: x.incorporated, status: x.status }));
  } catch {
    return [];
  }
}
