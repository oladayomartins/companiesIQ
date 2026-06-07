// QR code for a company's founder Growth Report (for printed letters).
//   /api/qr?number=00502851&source=digitwarehouse            → SVG (crisp for print)
//   /api/qr?number=00502851&format=png&download=1            → downloadable PNG
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const number = sp.get("number");
  const source = sp.get("source") || "digitwarehouse";
  const format = sp.get("format") || "svg";
  if (!number) return NextResponse.json({ error: "number required" }, { status: 400 });

  const target = `${req.nextUrl.origin}/company/${encodeURIComponent(number)}/growth-report?source=${encodeURIComponent(source)}`;
  const opts = { margin: 1, errorCorrectionLevel: "M" as const };

  try {
    if (format === "png") {
      const buf = await QRCode.toBuffer(target, { ...opts, type: "png", width: 800 });
      const disposition = sp.get("download") === "1" ? `attachment; filename="qr-${number}.png"` : "inline";
      return new NextResponse(new Uint8Array(buf), {
        headers: { "Content-Type": "image/png", "Content-Disposition": disposition, "Cache-Control": "public, max-age=86400" },
      });
    }
    const svg = await QRCode.toString(target, { ...opts, type: "svg" });
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return NextResponse.json({ error: "QR generation failed" }, { status: 500 });
  }
}
