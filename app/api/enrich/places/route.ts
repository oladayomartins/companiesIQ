// Dev-only Google Places probe — test the enrichment key locally.
//   /api/enrich/places?name=Greggs&locality=Newcastle
//   /api/enrich/places?number=NI027412   (pulls name+locality from Companies House)
// Disabled in production so a public endpoint can't burn Places quota.
import { NextRequest, NextResponse } from "next/server";
import { lookupPlace } from "@/lib/enrichment/places";
import { enrichCompany } from "@/lib/enrichment";
import { getCompanyBundle } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Probe disabled in production" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const useCache = sp.get("cache") === "1";
  const force = sp.get("force") === "1";
  try {
    let name = sp.get("name") ?? "";
    let locality = sp.get("locality") ?? undefined;
    let postcode = sp.get("postcode") ?? undefined;

    const number = sp.get("number");
    if (number) {
      const bundle = await getCompanyBundle(number);
      if (!bundle) return NextResponse.json({ error: `Company ${number} not found` }, { status: 404 });
      name = bundle.company.name;
      locality = bundle.company.geo?.locality ?? bundle.company.address?.locality ?? undefined;
      postcode = bundle.company.address?.postcode ?? bundle.company.geo?.postcode ?? undefined;
    }

    if (!name) {
      return NextResponse.json(
        { error: "Provide ?number=<companyNumber> or ?name=<business>&locality=<town>" },
        { status: 400 }
      );
    }

    // Cached path (needs a company number for the cache key); else raw lookup.
    if (useCache && number) {
      const result = await enrichCompany({ number, name, locality, postcode, force });
      return NextResponse.json(result);
    }

    const result = await lookupPlace({ name, locality, postcode });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "probe failed" }, { status: 502 });
  }
}
