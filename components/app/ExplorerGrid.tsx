"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, themeQuartz, type ColDef, type ICellRendererParams } from "ag-grid-community";
import { StatusPill, CompanyAvatar } from "@/components/ds";
import { ScorePill, KeywordChips } from "@/components/app/ScorePill";
import { ageLabel } from "@/lib/format";
import type { EnrichedResult } from "@/lib/data";

ModuleRegistry.registerModules([AllCommunityModule]);

// AG-Grid theme mapped to the CompaniesIQ ink/warm design tokens, so the
// grid honours the same palette as the bespoke data-tables.
const ciqTheme = themeQuartz.withParams({
  backgroundColor: "var(--surface-card)",
  foregroundColor: "var(--text-body)",
  headerBackgroundColor: "var(--surface-sunken)",
  headerTextColor: "var(--text-faint)",
  borderColor: "var(--border-hair)",
  rowBorder: { color: "var(--border-hair)" },
  accentColor: "var(--accent)",
  rowHoverColor: "color-mix(in srgb, var(--accent) 8%, transparent)",
  selectedRowBackgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
  oddRowBackgroundColor: "transparent",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  headerFontFamily: "var(--font-mono)",
  headerFontSize: 10,
  cellHorizontalPadding: 16,
  rowHeight: 56,
  headerHeight: 40,
  wrapperBorderRadius: 12,
});

function CompanyCell({ data }: ICellRendererParams<EnrichedResult>) {
  if (!data) return null;
  return (
    <div className="cell-co">
      <CompanyAvatar name={data.name} size="md" />
      <div>
        <div className="cell-co__name">{data.name}</div>
        <div className="cell-co__no">
          {data.number}
          {data.incorporated ? ` · inc. ${data.incorporated.slice(0, 4)}` : ""}
        </div>
      </div>
    </div>
  );
}

export function ExplorerGrid({ rows }: { rows: EnrichedResult[] }) {
  const router = useRouter();

  const columnDefs = useMemo<ColDef<EnrichedResult>[]>(
    () => [
      { headerName: "COMPANY", field: "name", flex: 2, minWidth: 240, cellRenderer: CompanyCell, sortable: true },
      {
        headerName: "STATUS",
        field: "status",
        width: 140,
        cellRenderer: (p: ICellRendererParams<EnrichedResult>) => <StatusPill status={String(p.value)} />,
      },
      {
        headerName: "SIGNALS",
        flex: 1.4,
        minWidth: 160,
        sortable: false,
        cellRenderer: (p: ICellRendererParams<EnrichedResult>) => <KeywordChips keywords={p.data?.keywords} strong={p.data?.score?.keywords ?? []} />,
      },
      { headerName: "REGION", field: "region", width: 150 },
      {
        headerName: "AGE",
        width: 100,
        type: "rightAligned",
        valueGetter: (p) => (p.data?.incorporated ? new Date().getFullYear() - Number(p.data.incorporated.slice(0, 4)) : -1),
        cellRenderer: (p: ICellRendererParams<EnrichedResult>) => <span className="mono">{ageLabel(p.data?.incorporated)}</span>,
      },
      {
        headerName: "OPPORTUNITY",
        width: 150,
        type: "rightAligned",
        valueGetter: (p) => p.data?.score?.total ?? 0,
        sort: "desc",
        cellRenderer: (p: ICellRendererParams<EnrichedResult>) => <ScorePill score={p.data?.score} />,
      },
    ],
    []
  );

  return (
    <div style={{ width: "100%" }}>
      <AgGridReact<EnrichedResult>
        theme={ciqTheme}
        rowData={rows}
        columnDefs={columnDefs}
        domLayout="autoHeight"
        suppressCellFocus
        defaultColDef={{ resizable: true, sortable: true, suppressMovable: false, cellStyle: { display: "flex", alignItems: "center", lineHeight: "normal" } }}
        onRowClicked={(e) => e.data && router.push(`/app/company/${e.data.number}`)}
        rowStyle={{ cursor: "pointer" }}
      />
    </div>
  );
}
