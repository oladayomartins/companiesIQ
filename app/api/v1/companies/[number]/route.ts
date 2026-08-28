// GET /api/v1/companies/{number} — a single company, key-authenticated.
import { NextResponse } from "next/server";
import { getCompanyBundle } from "@/lib/data";
import { CompaniesHouseError } from "@/lib/companies-house";
import { authenticateApiRequest, quotaHeaders } from "@/lib/api-keys";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { number } = await params;
  try {
    const bundle = await getCompanyBundle(number);
    if (!bundle) return NextResponse.json({ error: "Company not found." }, { status: 404 });
    const c = bundle.company;

    return NextResponse.json(
      {
        company_number: c.number,
        name: c.name,
        status: c.status,
        type: c.type ?? null,
        incorporated: c.incorporated ?? null,
        dissolved: c.dissolved ?? null,
        sic_codes: c.sicCodes,
        sector: c.primaryClassification?.sector ?? null,
        registered_office: c.address ?? null,
        region: c.geo?.region ?? null,
        accounts: c.accounts ?? null,
        confirmation_statement: c.confirmationStatement ?? null,
        counts: {
          officers: bundle.officers.length,
          pscs: bundle.pscs.length,
          charges: bundle.charges.length,
          filings: bundle.filings.length,
        },
        url: `https://www.companiesiq.co.uk/company/${c.number}`,
      },
      { headers: quotaHeaders(auth.used, auth.quota) }
    );
  } catch (e) {
    if (e instanceof CompaniesHouseError && e.status === 404) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Upstream register unavailable. Retry shortly." }, { status: 502 });
  }
}
