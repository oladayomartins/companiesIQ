// ============================================================
// POST /api/contacts/suppress — "stop showing this detail"
// ------------------------------------------------------------
// The opt-out that makes the rest of the contact pipeline defensible. A
// business or individual who does not want a published detail resurfaced here
// can say so, and lib/enrichment/contact.ts then filters that value on every
// read AND every write — so a later re-crawl cannot bring it back.
//
// Deliberately unauthenticated: requiring the person to create an account
// before they can ask us to stop is exactly the pattern UK GDPR Art. 21
// (objection) exists to prevent. Erring towards suppressing a value nobody
// objected to costs us one contact row; erring the other way costs someone
// their right to object.
// ============================================================
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/enrichment/phone";

export const dynamic = "force-dynamic";

const EMAIL_VALID = /^[a-z0-9._%+-]{1,64}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;
const MAX_VALUES = 20;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    values?: unknown;
    reason?: unknown;
    requestedBy?: unknown;
  };

  const raw = Array.isArray(body.values) ? body.values : typeof body.values === "string" ? [body.values] : [];
  if (!raw.length) return NextResponse.json({ error: "Provide the email address or phone number to suppress." }, { status: 400 });
  if (raw.length > MAX_VALUES) return NextResponse.json({ error: `At most ${MAX_VALUES} values per request.` }, { status: 400 });

  // Canonicalise to the same form the pipeline stores, or the suppression
  // silently fails to match: "020 1234 5678" must block "+442012345678".
  const rows: { value: string; kind: string }[] = [];
  for (const v of raw) {
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (EMAIL_VALID.test(trimmed)) {
      rows.push({ value: trimmed.toLowerCase(), kind: "email" });
      continue;
    }
    const phone = normalizePhone(trimmed);
    if (phone.e164) rows.push({ value: phone.e164, kind: "phone" });
  }
  if (!rows.length) {
    return NextResponse.json({ error: "That isn't a recognisable email address or UK phone number." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Suppression isn't available right now — please email us." }, { status: 503 });

  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : "owner request";
  const requestedBy = typeof body.requestedBy === "string" ? body.requestedBy.slice(0, 200) : null;

  const { error } = await admin
    .from("contact_suppressions")
    .upsert(
      rows.map((r) => ({ ...r, reason, requested_by: requestedBy })),
      { onConflict: "value" }
    );
  if (error) return NextResponse.json({ error: "Could not record the request. Please email us." }, { status: 502 });

  return NextResponse.json({ suppressed: rows.length });
}
