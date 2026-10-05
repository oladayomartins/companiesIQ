// One-click unsubscribe from Revenue Autopilot lifecycle emails (PECR).
// GET ?token=<profiles.growth_token> → sets marketing_opt_out and confirms.
// Account/billing emails from Stripe and Supabase auth are unaffected.
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · CompaniesIQ</title>
<body style="margin:0;background:#FAF6EF;font-family:Arial,sans-serif;color:#1C1815">
<div style="max-width:480px;margin:12vh auto;padding:32px;background:#fff;border:1px solid #E2D8C8;border-radius:16px">
<h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 10px">${title}</h1><p style="line-height:1.6">${body}</p>
<p><a href="/" style="color:#D9531F">Back to CompaniesIQ</a></p></div></body>`;
  return new NextResponse(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const admin = getSupabaseAdmin();
  if (!UUID.test(token) || !admin) return page("Link not recognised", "This unsubscribe link is invalid or has expired.", 400);
  const { data, error } = await admin.from("profiles").update({ marketing_opt_out: true }).eq("growth_token", token).select("id");
  if (error || !data?.length) return page("Link not recognised", "This unsubscribe link is invalid or has expired.", 400);
  return page("You're unsubscribed", "You won't receive product tips or upgrade reminders from CompaniesIQ any more. Receipts and sign-in emails still arrive as normal.");
}
