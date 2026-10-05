// The machine-readable half of a research report. Every measured row, both
// periods, and the exact register query behind each figure — so a reader,
// journalist or model can verify a claim without re-deriving the study.
import { NextResponse } from "next/server";
import { getDataset } from "@/lib/research/store";

export const revalidate = 3600;

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getDataset(slug);
  if (!d) return new NextResponse("Not found", { status: 404 });

  // Index the ledger so each row can carry the query that produced it.
  const queryFor = new Map<string, string>();
  for (const q of d.queries) {
    const qs = Object.entries(q.params)
      .flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => `${k}=${x}`) : [`${k}=${v}`]))
      .join("&");
    queryFor.set(q.label, `${q.endpoint}?${qs}`);
  }

  const headers = [
    "series", "key", "label", "group", "period", "period_from", "period_to", "value",
    "comparison_period", "comparison_value", "change", "change_pct", "share_of_total", "query",
  ];
  const rows: string[][] = [];
  for (const s of d.series) {
    for (const c of s.cells) {
      const q =
        [...queryFor.entries()].find(([label]) => label.startsWith(`${c.key} `) || label.includes(`${c.label} incorporations, ${d.period.label}`))?.[1] ?? "";
      rows.push([
        s.id, c.key, c.label, c.sub ?? "", d.period.id, d.period.from, d.period.to, String(c.value),
        d.comparison?.id ?? "", c.prev === undefined ? "" : String(c.prev),
        c.change === undefined ? "" : String(c.change),
        c.changePct === null || c.changePct === undefined ? "" : c.changePct.toFixed(6),
        c.share === undefined ? "" : c.share.toFixed(6),
        q,
      ]);
    }
  }

  const preamble = [
    `# ${d.title}`,
    `# Source: ${d.source.name} (${d.source.url})`,
    `# Licence: ${d.source.licence} — ${d.source.licenceUrl}. Company data (c) Crown copyright.`,
    `# Period: ${d.period.from} to ${d.period.to} inclusive. Retrieved: ${d.source.retrieved}.`,
    `# Attribution: CompaniesIQ Research. Please cite and link the report page.`,
  ].join("\n");

  const body = [preamble, headers.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `inline; filename="${slug}.csv"`,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
