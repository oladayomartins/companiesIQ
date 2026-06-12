import { NextRequest, NextResponse } from "next/server";
import { search, explore, exploreWithFiling } from "@/lib/data";

export const dynamic = "force-dynamic";

function isoFromWindow(win: string | null): string | undefined {
  if (!win || win === "any") return undefined;
  const d = new Date();
  if (win === "12m") d.setMonth(d.getMonth() - 12);
  else if (win === "5y") d.setFullYear(d.getFullYear() - 5);
  else if (win === "30d") d.setDate(d.getDate() - 30);
  else return undefined;
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const statuses = sp.getAll("status");
  const sics = sp.getAll("sic");
  const types = sp.getAll("type");
  const sector = sp.get("sector") || undefined;
  const regions = sp.getAll("region");
  const region = regions[0] || undefined;
  const incorporatedFrom = isoFromWindow(sp.get("incorporated"));
  const startIndex = Number(sp.get("start") || 0) || 0;

  // Filing-status filters (accountant queries) — only the register cache can
  // answer these, since Companies House search can't filter on filing status.
  const accountsOverdue = sp.get("accountsOverdue") === "1";
  const accountsDueDays = Number(sp.get("accountsDue") || 0) || 0;
  const confirmationDue = sp.get("confirmationDue") === "1";
  const ownerNationality = sp.get("nationality") || undefined;
  // Both filing status and owner nationality need per-company enrichment (CH
  // search can't filter on either) — handled by the request-driven path.
  const needsEnrichment = accountsOverdue || accountsDueDays > 0 || confirmationDue || !!ownerNationality;

  // Note: startIndex is NOT a facet — a paginated plain query should stay on the
  // same (name-search) endpoint across pages, not switch to advanced search.
  const hasFacets = statuses.length > 0 || sics.length > 0 || types.length > 0 || !!sector || !!region || !!incorporatedFrom;

  try {
    if (needsEnrichment) {
      // Request-driven: enrich the live search candidates (filing status and/or
      // owner nationality) on demand, cached, then filter — no pre-loaded register.
      const r = await exploreWithFiling(
        {
          q: q || undefined,
          status: statuses.length ? statuses : undefined,
          sicCodes: sics.length ? sics : undefined,
          companyType: types.length ? types : undefined,
          sector,
          region,
          regions: regions.length ? regions : undefined,
          incorporatedFrom,
          size: 40,
          startIndex,
        },
        {
          accountsOverdue: accountsOverdue || undefined,
          accountsDueDays: accountsDueDays || undefined,
          confirmationDue: confirmationDue || undefined,
        },
        ownerNationality
      );
      return NextResponse.json(r);
    }
    if (q && !hasFacets) {
      const r = await search(q, startIndex);
      return NextResponse.json(r);
    }
    const r = await explore({
      q: q || undefined,
      status: statuses.length ? statuses : undefined,
      sicCodes: sics.length ? sics : undefined,
      companyType: types.length ? types : undefined,
      sector,
      region,
      regions: regions.length ? regions : undefined,
      incorporatedFrom,
      size: 40,
      startIndex,
    });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed", total: 0, results: [], live: false },
      { status: 502 }
    );
  }
}
