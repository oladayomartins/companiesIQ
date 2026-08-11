// Public opt-in for the free weekly new-company alert (lead magnet).
// POST { email, firstName?, company?, sector?, region?, source?, website? }
// `website` is a honeypot — if a bot fills it, we 200 without storing.
import { NextRequest, NextResponse } from "next/server";
import { subscribeFreeAlert } from "@/lib/free-alerts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as {
    email?: string; firstName?: string; company?: string; sector?: string; region?: string; source?: string; website?: string;
  };

  // Honeypot: real users never fill a hidden field. Pretend success for bots.
  if (b.website && b.website.trim()) return NextResponse.json({ ok: true });

  if (!b.email) return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });

  const res = await subscribeFreeAlert({
    email: b.email,
    firstName: b.firstName?.slice(0, 80),
    company: b.company?.slice(0, 120),
    sector: b.sector?.slice(0, 60),
    region: b.region?.slice(0, 60),
    source: b.source?.slice(0, 60),
  });
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}
