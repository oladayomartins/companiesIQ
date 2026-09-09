// Reveal a director's enriched contact (email / direct dial). Team+ gated,
// audited, cached. Third-party enrichment — fenced from the register.
//
// POST { officerId }  ->  DirectorContact (fields null = "Not Assessed")
//   401 not signed in · 403 not on a contact-data plan · 503 no provider wired
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { canUseContactData } from "@/lib/access";
import { getOfficerProfile } from "@/lib/data";
import { enrichDirectorContact, isContactEnrichConfigured, logContactReveal } from "@/lib/enrichment/contacts";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!(await canUseContactData(user))) {
    return NextResponse.json({ error: "Contact data is available on the Team and Enterprise plans." }, { status: 403 });
  }
  if (!isContactEnrichConfigured()) {
    return NextResponse.json({ error: "Contact enrichment isn't configured yet." }, { status: 503 });
  }

  const { officerId } = (await req.json().catch(() => ({}))) as { officerId?: string };
  if (!officerId) return NextResponse.json({ error: "officerId is required." }, { status: 400 });

  // Pull the register profile to give the provider a name + companies to match on.
  const profile = await getOfficerProfile(officerId);
  if (!profile) return NextResponse.json({ error: "Director not found." }, { status: 404 });
  if (profile.isCorporate) {
    return NextResponse.json({ error: "Contact enrichment applies to individuals, not corporate officers." }, { status: 422 });
  }

  const companies = profile.appointments
    .filter((a) => a.active)
    .slice(0, 5)
    .map((a) => ({ name: a.companyName, number: a.companyNumber }));

  try {
    const contact = await enrichDirectorContact({ officerId, name: profile.name, companies });
    // Audit the reveal (GDPR accountability + usage metering).
    await logContactReveal(officerId, user.id);
    return NextResponse.json({ contact });
  } catch {
    return NextResponse.json({ error: "Enrichment failed — try again shortly." }, { status: 502 });
  }
}
