// ============================================================
// POST /api/contacts/director/{officerId} — director contact reveal
// ------------------------------------------------------------
// The third-party-enriched sibling of POST /api/contacts/{number}: a director's
// business email / direct dial from the provider behind CONTACT_ENRICH_URL.
// Same rules as the company route — POST so no crawler or prefetch can spend a
// paid lookup, plan-gated and metered by DISTINCT director per month
// (caps.directorLookups), and every reveal written to the audit log.
//
//   401 signed out · 403 plan / quota · 503 no provider · 404 / 422 bad officer
// ============================================================
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { directorContactAllowance, recordDirectorLookup } from "@/lib/access";
import { getOfficerProfile } from "@/lib/data";
import { getDirectorContacts, isContactEnrichConfigured } from "@/lib/enrichment/director-contact";
import { audit } from "@/lib/audit";
import { planById } from "@/lib/subscription";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request, { params }: { params: Promise<{ officerId: string }> }) {
  const { officerId } = await params;
  const user = await getCurrentUser();

  const allowance = await directorContactAllowance(user, officerId);
  if (!allowance.allowed) {
    const message =
      allowance.reason === "signed-out"
        ? "Sign in to look up director contact details."
        : allowance.reason === "plan"
          ? `Director contact details are included from ${planById("team").name} upwards.`
          : `You've used all ${allowance.limit} director lookups on your plan this month.`;
    return NextResponse.json({ error: message, allowance }, { status: allowance.reason === "signed-out" ? 401 : 403 });
  }
  if (!isContactEnrichConfigured()) {
    return NextResponse.json({ error: "Director contact enrichment isn't configured yet." }, { status: 503 });
  }

  // The register profile gives the provider a name + companies to match on.
  const profile = await getOfficerProfile(officerId).catch(() => null);
  if (!profile) return NextResponse.json({ error: "Director not found." }, { status: 404 });
  if (profile.isCorporate) {
    return NextResponse.json({ error: "Contact enrichment applies to individuals, not corporate officers." }, { status: 422 });
  }

  const companies = profile.appointments
    .filter((a) => a.active)
    .slice(0, 5)
    .map((a) => ({ name: a.companyName, number: a.companyNumber }));

  try {
    const contacts = await getDirectorContacts({ officerId, name: profile.name, companies });
    await recordDirectorLookup(user, officerId).catch(() => {});
    // Personal data revealed to a named user — the accountability record UK GDPR
    // expects (who accessed whose details, when).
    await audit({
      userId: user!.id,
      actorEmail: user!.email,
      action: "contact.reveal",
      subject: `officer:${officerId}`,
      meta: { status: contacts.status, provider: contacts.provider, cached: contacts.cached },
      req,
    });
    return NextResponse.json({ contacts, allowance: await directorContactAllowance(user, officerId) });
  } catch {
    return NextResponse.json({ error: "Enrichment failed — try again shortly." }, { status: 502 });
  }
}
