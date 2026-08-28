"use client";
// The data-index archetype's list: filter + cards/table toggle over the sector
// table.
//
// Progressive enhancement, not a data source. Every sector is passed in as a
// prop and rendered on the server, so the full list — names, figures and links
// — is in the initial HTML with JavaScript disabled. The filter and the toggle
// only ever narrow or re-present what is already on the page; they never fetch,
// and they are never the only way to see a row.
import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ds";
import { fmtNumber, fmtDelta } from "@/lib/format";
import { slugify } from "@/lib/slug";

export interface SectorRow {
  sector: string;
  businesses: number;
  newLastYear: number;
  annualGrowth: number;
}

export function SectorExplorer({ sectors }: { sectors: SectorRow[] }) {
  const [filter, setFilter] = useState("");
  const [view, setView] = useState<"cards" | "table">("cards");

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return sectors;
    return sectors.filter((s) => s.sector.toLowerCase().includes(q));
  }, [sectors, filter]);

  const noun = shown.length === 1 ? "sector" : "sectors";

  return (
    <>
      <div className="dx-controls">
        <div className="dx-search">
          <Icon name="search" size={16} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter sectors…"
            aria-label="Filter sectors by name"
          />
          {filter ? (
            <button type="button" onClick={() => setFilter("")} aria-label="Clear filter">
              <Icon name="x" size={14} />
            </button>
          ) : null}
        </div>

        <span className="dx-count mono" aria-live="polite">
          {shown.length} {noun}
        </span>

        <div className="dx-toggle" role="group" aria-label="View as">
          <button
            type="button"
            className={view === "cards" ? "is-on" : ""}
            aria-pressed={view === "cards"}
            onClick={() => setView("cards")}
          >
            Cards
          </button>
          <button
            type="button"
            className={view === "table" ? "is-on" : ""}
            aria-pressed={view === "table"}
            onClick={() => setView("table")}
          >
            Table
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="dx-empty">
          <div className="dx-empty__title">No sector matches “{filter}”</div>
          <p className="dx-empty__sub">
            Sector names follow the SIC groupings. Try “tech”, “retail” or “care” — or clear the filter to see all{" "}
            {sectors.length}.
          </p>
          <button type="button" className="dx-empty__btn" onClick={() => setFilter("")}>
            Clear filter
          </button>
        </div>
      ) : view === "cards" ? (
        <div className="dx-cards">
          {shown.map((s, i) => (
            <Link
              className="dx-card"
              key={s.sector}
              href={`/industry/${slugify(s.sector)}`}
              // Entrance stagger is a CSS custom property, so the animation is
              // declarative and disabled wholesale by reduced-motion.
              style={{ "--i": i } as React.CSSProperties}
            >
              <span className="dx-card__head">
                <span className="dx-card__name">{s.sector}</span>
                <Icon name="arrowRight" size={15} />
              </span>
              <span className="dx-card__stats">
                <span>
                  <strong className="mono">{fmtNumber(s.businesses)}</strong> active
                </span>
                <span>
                  <strong className="mono">{fmtNumber(s.newLastYear)}</strong> new · 12m
                </span>
              </span>
              <span className={`dx-pill${s.annualGrowth >= 5 ? " is-pos" : ""}`}>
                <span className="dx-pill__dot" aria-hidden="true" />
                <span className="mono">{fmtDelta(s.annualGrowth)} annual growth</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="dx-tablewrap">
          <table className="dx-table">
            <thead>
              <tr>
                <th scope="col">Sector</th>
                <th scope="col">Active</th>
                <th scope="col">New · 12m</th>
                <th scope="col">Growth</th>
                <th scope="col">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.sector}>
                  <th scope="row">
                    <Link href={`/industry/${slugify(s.sector)}`}>{s.sector}</Link>
                  </th>
                  <td className="mono">{fmtNumber(s.businesses)}</td>
                  <td className="mono">{fmtNumber(s.newLastYear)}</td>
                  <td className={`mono${s.annualGrowth >= 5 ? " is-pos" : ""}`}>{fmtDelta(s.annualGrowth)}</td>
                  <td className="dx-table__go">
                    <Link href={`/industry/${slugify(s.sector)}`} aria-label={`Open ${s.sector}`}>
                      <Icon name="arrowRight" size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
