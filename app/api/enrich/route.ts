// Enrich-my-list — POST a list of company numbers, get scored rows back. Pro-gated.
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { hasProAccess } from "@/lib/access";
import { enrichNumbers } from "@/lib/enrich";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!(await hasProAccess(user))) return NextResponse.json({ error: "Pro feature." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { numbers?: string[] };
  if (!Array.isArray(body.numbers) || !body.numbers.length) {
    return NextResponse.json({ error: "No company numbers provided." }, { status: 400 });
  }
  try {
    const result = await enrichNumbers(body.numbers);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Enrichment failed — the register may be busy. Try again shortly." }, { status: 502 });
  }
}
