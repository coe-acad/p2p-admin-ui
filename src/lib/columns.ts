import type { ColDef } from "ag-grid-community";

import { cn } from "@/lib/utils";

/**
 * Right-aligned money column. Pushes the header label and cell body to the flex
 * end (via the atria-grid CSS) so amounts share a right edge and decimals line
 * up down the column — the single most-noticed detail in a fintech grid.
 */
export function moneyColumn<T>(col: ColDef<T>): ColDef<T> {
  return {
    ...col,
    headerClass: cn("ag-right-aligned-header", col.headerClass as string),
    cellClass: cn("atria-cell atria-cell-right", col.cellClass as string),
  };
}
