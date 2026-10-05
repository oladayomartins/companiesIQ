// The full dataset behind a research report, including the query ledger.
// Referenced from the report's Dataset structured data as a distribution.
import { NextResponse } from "next/server";
import { getDataset } from "@/lib/research/store";

export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getDataset(slug);
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(d, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
