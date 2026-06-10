"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardBody, Button, Badge, Icon, CompanyAvatar } from "@/components/ds";
import { fmtDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { WatchedCompany } from "@/lib/watchlist";

export function WatchlistsScreen({ companies }: { companies: WatchedCompany[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function unwatch(number: string) {
    setBusy(number);
    try {
      await fetch(`/api/watch?number=${encodeURIComponent(number)}`, { method: "DELETE" });
      toast("Removed from watchlist", { tone: "info" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Saved companies</div>
          <h1 className="screen-title">Watchlist</h1>
        </div>
        {companies.length ? (
          <Badge tone="neutral" dot>
            {companies.length} watched
          </Badge>
        ) : null}
      </div>

      <Card variant="flat">
        <CardBody flush>
          {companies.length ? (
            <div className="table-scroll">
              <table className="data-table data-table--full">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Sector</th>
                    <th>Region</th>
                    <th>Watched</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.number} onClick={() => router.push(`/company/${c.number}`)}>
                      <td>
                        <div className="cell-co">
                          <CompanyAvatar name={c.name ?? c.number} size="sm" />
                          <div>
                            <div className="cell-co__name">{c.name ?? c.number}</div>
                            <div className="cell-co__no mono">{c.number}</div>
                          </div>
                        </div>
                      </td>
                      <td className="muted">{c.sector ?? "—"}</td>
                      <td className="muted">{c.region ?? "—"}</td>
                      <td className="mono">{c.addedAt ? fmtDate(c.addedAt) : "—"}</td>
                      <td className="num" onClick={(e) => e.stopPropagation()}>
                        <button className="prospect-row__rm" onClick={() => unwatch(c.number)} disabled={busy === c.number} aria-label="Unwatch">
                          <Icon name="x" size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="prospects__empty">
              <Icon name="bookmark" size={28} />
              <p>You haven&apos;t watched any companies yet. Open any company report and hit &ldquo;Watch&rdquo; to track it here.</p>
              <Link href="/app/companies">
                <Button variant="primary" size="sm" iconRight="arrowRight">
                  Find companies
                </Button>
              </Link>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
