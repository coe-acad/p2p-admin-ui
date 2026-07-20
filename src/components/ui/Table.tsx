import { ChevronRight } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

interface ColumnDef<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

interface TableProps<T> {
  rows: T[];
  columns: ColumnDef<T>[];
  emptyMessage?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
}

const alignClass = (align?: "left" | "right" | "center") => {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
};

export function Table<T>({
  rows,
  columns,
  emptyMessage = "No records.",
  emptyDescription,
  onRowClick,
  isLoading,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <SkeletonRows rows={6} columns={Math.min(columns.length, 6)} bare />
    );
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyMessage} description={emptyDescription} bare />;
  }

  return (
    <div className="thin-scroll max-h-[calc(100vh-22rem)] overflow-auto">
      <table className="w-full">
        {/* One table dialect: header + cell typography matched to the grid. */}
        <thead className="sticky top-0 z-10 border-b border-border bg-muted/55 backdrop-blur">
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                className={cn(
                  "px-4 py-2.5 text-overline uppercase text-muted-foreground",
                  alignClass(column.align),
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
            {onRowClick && <th className="w-8" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className={cn(
                "group transition-colors hover:bg-primary/[0.06]",
                onRowClick && "cursor-pointer"
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={cn(
                    "px-4 py-2.5 text-[13px] text-foreground/90",
                    alignClass(column.align),
                    column.className
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
              {onRowClick && (
                <td className="px-3 text-muted-foreground/50 group-hover:text-muted-foreground">
                  <ChevronRight className="h-4 w-4" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
