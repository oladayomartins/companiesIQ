// Lead capture for the founder Growth Report funnel.
import { NextRequest, NextResponse } from "next/server";
import { createLead } from "@/lib/leads";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const s = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : undefined);
  const baseUrl = req.nextUrl.origin;

  const result = await createLead(
    {
      companyNumber: s("companyNumber") || "",
      companyName: s("companyName"),
      firstName: s("firstName"),
      lastName: s("lastName"),
      email: s("email") || "",
      phone: s("phone"),
      source: s("source"),
      partner: s("partner"),
    },
    baseUrl
  );

  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
