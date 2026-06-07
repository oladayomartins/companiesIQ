// Email-confirmation link target — marks a lead verified, then redirects
// back to their Growth Report.
import { NextRequest, NextResponse } from "next/server";
import { verifyLead } from "@/lib/leads";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const res = await verifyLead(token);
  const base = req.nextUrl.origin;
  if (!res.ok || !res.companyNumber) {
    return NextResponse.redirect(`${base}/?verify=invalid`);
  }
  const src = res.source ? `&source=${encodeURIComponent(res.source)}` : "";
  return NextResponse.redirect(`${base}/company/${res.companyNumber}/growth-report?verified=1${src}`);
}
