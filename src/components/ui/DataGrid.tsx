import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  colorSchemeDark,
  colorSchemeLight,
  type ColDef,
} from "ag-grid-community";

import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

ModuleRegistry.registerModules([AllCommunityModule]);

interface DataGridProps<T> {
  columns: ColDef<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  onRowHover?: (row: T) => void;
  loading?: boolean;
  /** subtle 2px progress bar at the top edge — for revalidations */
  fetching?: boolean;
  className?: string;
  rowKey?: keyof T;
  /**
   * Server-paged mode: turns off AG Grid's client pagination, column filter
   * menus, and column sort. Use with our own <Pager /> below the grid.
   */
  serverPaged?: boolean;
  /** row height override. Default 44 (client), 40 (server-paged, denser). */
  rowHeight?: number;
  /** hide the built-in AG Grid "no rows" overlay so <ListPageState /> owns it. */
  suppressNoRowsOverlay?: boolean;
  /** Drop the grid's own border/radius/shadow — for use inside <GridCard />. */
  framed?: boolean;
  /** Pinned bottom row(s), e.g. a page-sum row on money grids. */
  pinnedBottomRows?: T[];
  /** Persistent row accent, e.g. "atria-row-danger" on FAILED rows. */
  getRowClass?: (row: T) => string | undefined;
}

const PRIMARY_HUE = "240 60% 42%";
const PRIMARY_HUE_DARK = "240 70% 68%";

/** Atria-themed AG-Grid wrapper.
 *
 * Theming API maps the HSL token palette; `atria-grid` class in index.css
 * layers on the polish AG-Grid's params can't reach (full-row hover tint,
 * compact pagination bar styled like our buttons, monospace ID columns,
 * column-hover accent stripe). */
export function DataGrid<T extends object>({
  columns,
  rows,
  onRowClick,
  onRowHover,
  loading,
  fetching,
  className,
  rowKey,
  serverPaged = false,
  rowHeight,
  suppressNoRowsOverlay,
  framed = true,
  pinnedBottomRows,
  getRowClass,
}: DataGridProps<T>) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const gridTheme = useMemo(() => {
    const accent = isDark ? PRIMARY_HUE_DARK : PRIMARY_HUE;
    return themeQuartz
      .withPart(isDark ? colorSchemeDark : colorSchemeLight)
      .withParams({
        accentColor: `hsl(${accent})`,
        backgroundColor: isDark ? "hsl(36 8% 11%)" : "hsl(0 0% 100%)",
        foregroundColor: isDark ? "hsl(40 14% 95%)" : "hsl(222 16% 12%)",
        borderColor: isDark ? "hsl(36 8% 18%)" : "hsl(44 16% 88%)",
        rowBorder: { color: isDark ? "hsl(36 8% 15%)" : "hsl(44 16% 92%)" },
        columnBorder: false,
        chromeBackgroundColor: isDark ? "hsl(36 8% 13%)" : "hsl(46 26% 96%)",
        headerBackgroundColor: isDark ? "hsl(36 8% 13%)" : "hsl(46 26% 96%)",
        headerTextColor: isDark ? "hsl(40 8% 66%)" : "hsl(220 9% 40%)",
        headerFontSize: 11,
        headerFontWeight: 600,
        headerHeight: 38,
        rowHoverColor: isDark
          ? `hsl(${accent} / 0.14)`
          : `hsl(${accent} / 0.06)`,
        selectedRowBackgroundColor: isDark
          ? `hsl(${accent} / 0.20)`
          : `hsl(${accent} / 0.10)`,
        oddRowBackgroundColor: "transparent",
        fontFamily: '"Inter Variable", Inter, ui-sans-serif, system-ui',
        fontSize: 13,
        spacing: 6,
        wrapperBorderRadius: framed ? 12 : 0,
        borderRadius: 6,
        cellHorizontalPadding: 14,
        inputBorderRadius: 6,
        menuBackgroundColor: isDark ? "hsl(36 8% 13%)" : "hsl(0 0% 100%)",
        menuShadow:
          "0 12px 32px -8px rgba(15, 23, 42, 0.18), 0 4px 12px -2px rgba(15, 23, 42, 0.08)",
      });
  }, [isDark, framed]);

  const defaultColDef: ColDef<T> = useMemo(
    () => ({
      // In server-paged mode, client filter/sort would lie (only sees current
      // page), so we disable them. Use the filter chips above the grid instead.
      sortable: !serverPaged,
      filter: !serverPaged,
      resizable: true,
      minWidth: 110,
      flex: 1,
      cellClass: "atria-cell",
    }),
    [serverPaged]
  );

  return (
    <div
      style={{ width: "100%", minHeight: 140 }}
      className={cn(
        "atria-grid relative animate-fade-in overflow-hidden",
        framed && "rounded-xl border border-border shadow-soft",
        onRowClick && "atria-grid-clickable",
        className
      )}
    >
      {fetching && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[2px] overflow-hidden"
        >
          <div className="atria-progress h-full w-1/3 bg-primary/80" />
        </div>
      )}
      <AgGridReact<T>
        theme={gridTheme}
        rowData={rows}
        columnDefs={columns}
        defaultColDef={defaultColDef}
        pinnedBottomRowData={pinnedBottomRows}
        getRowClass={
          getRowClass
            ? (params) => (params.data ? getRowClass(params.data) : undefined)
            : undefined
        }
        loading={loading}
        domLayout="autoHeight"
        animateRows
        rowHeight={rowHeight ?? (serverPaged ? 40 : 44)}
        headerHeight={38}
        onRowClicked={
          onRowClick
            ? (event) => {
                if (event.data) onRowClick(event.data);
              }
            : undefined
        }
        onCellMouseOver={
          onRowHover
            ? (event) => {
                if (event.data) onRowHover(event.data as T);
              }
            : undefined
        }
        pagination={!serverPaged}
        paginationPageSize={!serverPaged ? 10 : undefined}
        paginationPageSizeSelector={
          !serverPaged ? [10, 25, 50, 100, 200, 500, 1000] : undefined
        }
        suppressNoRowsOverlay={suppressNoRowsOverlay}
        getRowId={
          rowKey
            ? (params) =>
                String(
                  (params.data as Record<string, unknown>)[rowKey as string]
                )
            : undefined
        }
        suppressCellFocus
        cellSelection={false}
      />
    </div>
  );
}
