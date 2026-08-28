// GET /api/v1/search — public, key-authenticated company search.
//
// Deliberately a thin, stable projection over lib/data rather than a passthrough
// of our internal shapes: the app's EnrichedResult is free to change, a
// published API contract is not.
import { NextResponse } from "next/server";
import { search, explore } from "@/lib/data";
import { authenticateApiRequest, quotaHeaders } from "@/lib/api-keys";
import { readQuery } from "@/lib/search-parse";

export const dynamic = "force-dynamic";

const MAX_SIZE = 100;

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim();
  const sector = sp.get("sector") || undefined;
  const region = sp.get("region") || undefined;
  const status = sp.getAll("status");
  const size = Math.min(Number(sp.get("size") || 20) || 20, MAX_SIZE);
  const start = Math.max(Number(sp.get("start") || 0) || 0, 0);

  try {
    // A bare q with no facets is a name search; anything else needs the
    // faceted path. Same routing the app uses, so results do not diverge.
    const faceted = !!(sector || region || status.length);
    const r = faceted
      ? await explore({
          q: q || undefined,
          sector,
          region,
          status: status.length ? status : undefined,
          size,
          startIndex: start,
        })
      : await search(q, start);

    const results = r.results.slice(0, size).map((c) => ({
      company_number: c.number,
      name: c.name,
      status: c.status,
      incorporated: c.incorporated ?? null,
      sic_codes: c.sicCodes,
      sector: c.classification?.sector ?? null,
      region: c.region ?? null,
      locality: c.locality ?? null,
      url: `https://www.companiesiq.co.uk/company/${c.number}`,
    }));

    return NextResponse.json(
      { total: r.total, count: results.length, start, results },
      { headers: quotaHeaders(auth.used, auth.quota) }
    );
  } catch {
    return NextResponse.json({ error: "Upstream register unavailable. Retry shortly." }, { status: 502 });
  }
}
