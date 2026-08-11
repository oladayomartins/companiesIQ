// One-click unsubscribe from the free alert. GET /api/free-alerts/unsubscribe?token=…
// Returns a small on-brand confirmation page (email clients open links via GET).
import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/free-alerts";

export const dynamic = "force-dynamic";

function page(title: string, body: string): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="robots" content="noindex"/><title>${title} · CompaniesIQ</title></head>
  <body style="margin:0;background:#FAF6EF;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif">
    <div style="max-width:440px;margin:12vh auto;background:#fff;border:1px solid #E2D8C8;border-radius:16px;padding:36px;text-align:center">
      <div style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#1C1815;margin-bottom:14px">
        <span style="display:inline-block;width:22px;height:22px;background:#D9531F;border-radius:6px;vertical-align:middle;margin-right:8px"></span>Companies<span style="color:#D9531F">IQ</span>
      </div>
      <h1 style="font-size:20px;color:#1C1815;margin:0 0 10px">${title}</h1>
      <p style="font-size:14px;color:#57514A;line-height:1.55;margin:0 0 20px">${body}</p>
      <a href="https://www.companiesiq.co.uk" style="background:#D9531F;color:#fff;padding:11px 18px;border-radius:9px;text-decoration:none;font-size:14px;font-weight:600">Back to CompaniesIQ</a>
    </div>
  </body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const ok = token ? await unsubscribeByToken(token) : false;
  return ok
    ? page("You’ve unsubscribed", "You won’t receive any more new-company alert emails. Changed your mind? You can subscribe again any time.")
    : page("Link not recognised", "That unsubscribe link is invalid or has already been used. If you keep receiving emails, reply and we’ll remove you.");
}
