import { Card, CardHeader, CardBody, Stat, Badge } from "@/components/ds";
import { financialGrowth, type CompanyFinancials, type GrowthTier } from "@/lib/enrichment/financials-types";

function gbp(n: number | null): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `£${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}m`;
  if (abs >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString("en-GB")}`;
}

function pctLabel(p: number | null): string | undefined {
  if (p == null) return undefined;
  return `${p >= 0 ? "+" : ""}${p}%`;
}
function tierTone(t: GrowthTier): "pos" | "warn" | "neutral" {
  return t === "Growing" ? "pos" : t === "Declining" ? "warn" : "neutral";
}

// Financials parsed from the company's latest filed accounts (iXBRL). Enrichment
// layer — labelled clearly as from filed accounts, not the live register. Shows
// an honest "not assessed" state when no machine-readable accounts exist.
export function FinancialsCard({ financials, company }: { financials: CompanyFinancials; company: string }) {
  const f = financials;
  const hasFigures = f.assessed && (f.turnover != null || f.netAssets != null || f.cash != null || f.employees != null);
  const g = financialGrowth(f);

  return (
    <Card className="fin-card">
      <CardHeader
        subtitle="Filed accounts · enrichment"
        title="Financials"
        action={
          <span style={{ display: "inline-flex", gap: 8 }}>
            {g.tier ? <Badge tone={tierTone(g.tier)} dot>{g.tier}</Badge> : null}
            {f.accountsType ? <Badge tone="neutral">{f.accountsType} accounts</Badge> : null}
          </span>
        }
      />
      <CardBody>
        {hasFigures ? (
          <>
            <div className="fin-grid">
              <Stat label="Turnover" value={gbp(f.turnover)} delta={pctLabel(g.turnoverPct)} />
              <Stat label="Net worth" value={gbp(f.netAssets)} delta={pctLabel(g.netWorthPct)} />
              <Stat label="Cash" value={gbp(f.cash)} />
              <Stat label="Employees" value={f.employees != null ? f.employees.toLocaleString("en-GB") : "—"} />
            </div>
            <p className="fin-src mono">
              From {company}&apos;s filed accounts at Companies House
              {f.periodEnd ? `, period ending ${f.periodEnd}` : ""}
              {f.filedOn ? ` · filed ${f.filedOn}` : ""}.
              {g.tier ? ` Change vs the prior year${f.prevPeriodEnd ? ` (to ${f.prevPeriodEnd})` : ""}.` : ""} As-filed
              figures — a signal, not an audited verdict. Dashes are not tagged in the accounts.
            </p>
          </>
        ) : (
          <p className="fin-none">
            {f.accountsType === "dormant"
              ? "This company filed dormant accounts — no trading figures to show."
              : "No machine-readable accounts to parse yet. New companies often haven’t filed, and some file PDF-only or dormant accounts."}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
