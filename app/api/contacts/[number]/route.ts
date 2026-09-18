// ============================================================
// POST /api/contacts/{number} — verified contact discovery for one company
// ------------------------------------------------------------
// Runs (or reads the cache for) Layer 2/3 of the enrichment pipeline: find the
// company's own website, read the pages it publishes contact details on, and
// return each value with the checks that were run against it.
//
// Not a GET, and deliberately so: a cache miss performs outbound requests to a
// third party's web server and consumes the caller's monthly allowance, so it
// must not be triggerable by a crawler, a prefetch or a <link rel=prerender>.
//
// Plan-gated (lib/access.ts) and metered by DISTINCT company per month.
// ============================================================
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { contactAllowance, recordContactLookup } from "@/lib/access";
import { getCompanyContacts } from "@/lib/enrichment/contact";
import { enrichCompany } from "@/lib/enrichment";
import { getCompanyBundle } from "@/lib/data";
import { ENTRY_PAID_PLAN } from "@/lib/subscription";

export const dynamic = "force-dynamic";
// Crawling a handful of pages on someone else's server, politely and
// sequentially, does not fit in the default budget.
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await getCurrentUser();

  const allowance = await contactAllowance(user, number);
  if (!allowance.allowed) {
    const message =
      allowance.reason === "signed-out"
        ? "Sign in to look up verified contact details."
        : allowance.reason === "plan"
          ? `Verified contact discovery is included from ${ENTRY_PAID_PLAN.name} upwards.`
          : `You've used all ${allowance.limit} contact lookups on your plan this month.`;
    return NextResponse.json({ error: message, allowance }, { status: allowance.reason === "signed-out" ? 401 : 403 });
  }

  const bundle = await getCompanyBundle(number).catch(() => null);
  if (!bundle) return NextResponse.json({ error: "Company not found." }, { status: 404 });
  const c = bundle.company;

  try {
    // The Google Business Profile, when there is one, hands us a declared
    // website and phone for free — a much better starting point than guessing
    // a domain, so reuse the existing Places cache before crawling anything.
    const places = await enrichCompany({
      number: c.number,
      name: c.name,
      locality: c.geo?.locality ?? c.address?.locality,
      postcode: c.address?.postcode ?? c.geo?.postcode,
    }).catch(() => null);

    const contacts = await getCompanyContacts({
      number: c.number,
      name: c.name,
      postcode: c.address?.postcode ?? c.geo?.postcode,
      placesWebsite: places?.websiteUrl ?? null,
      placesPhone: places?.phone ?? null,
      placesSource: places?.placesSource ?? null,
    });

    // Only a lookup that actually ran costs a unit. A cache hit inside the TTL
    // still records the company so the month's count is "companies researched".
    await recordContactLookup(user, c.number).catch(() => {});

    return NextResponse.json({ contacts, allowance: await contactAllowance(user, c.number) });
  } catch {
    return NextResponse.json({ error: "Contact discovery failed. Try again shortly." }, { status: 502 });
  }
}
