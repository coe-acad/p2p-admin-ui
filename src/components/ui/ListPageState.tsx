import { AlertTriangle, FilterX, Inbox } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

interface ListPageStateProps<T> {
  status: "pending" | "error" | "success";
  rows: T[] | undefined;
  error?: unknown;
  onRetry?: () => void;
  onClearFilters?: () => void;
  hasFilters?: boolean;
  resourceLabel: string; // "users", "payments", "refunds", "audit rows", ...
  columns?: number;
  errorId?: string | null;
  className?: string;
  children: React.ReactNode; // the grid + pager when data ready
}

const messageFrom = (error: unknown): string => {
  if (!error) return "Something went wrong.";
  if (error instanceof Error) return error.message;
  const anyError = error as { message?: string };
  return anyError.message ?? "Something went wrong.";
};

/**
 * Coordinator for list-page render states: skeleton | error | filtered-empty
 * | empty | data. Keeps the grid card mounted where possible so height doesn't
 * jump between renders.
 */
export function ListPageState<T>({
  status,
  rows,
  error,
  onRetry,
  onClearFilters,
  hasFilters,
  resourceLabel,
  columns = 5,
  errorId,
  className,
  children,
}: ListPageStateProps<T>) {
  // Cold load: no rows yet + loading
  if (status === "pending" && (!rows || rows.length === 0)) {
    return (
      <div className={cn("animate-fade-in", className)}>
        <SkeletonRows rows={10} columns={columns} />
      </div>
    );
  }

  // Hard error, no rows to fall back on
  if (status === "error" && (!rows || rows.length === 0)) {
    return (
      <div className={cn("animate-fade-in", className)}>
        <EmptyState
          icon={AlertTriangle}
          tone="danger"
          title="Couldn't load"
          description={messageFrom(error)}
          action={
            <div className="flex flex-col items-center gap-2">
              {onRetry && (
                <Button variant="primary" onClick={onRetry}>
                  Retry
                </Button>
              )}
              {errorId && (
                <p className="font-mono text-[10px] text-muted-foreground/60">
                  err_id {errorId}
                </p>
              )}
            </div>
          }
        />
      </div>
    );
  }

  // Empty (with filters active)
  if (status === "success" && (!rows || rows.length === 0) && hasFilters) {
    return (
      <div className={cn("animate-fade-in", className)}>
        <EmptyState
          icon={FilterX}
          title="No matches"
          description="Try clearing filters or widening the date range."
          action={
            onClearFilters && (
              <Button variant="secondary" onClick={onClearFilters}>
                Clear filters
              </Button>
            )
          }
        />
      </div>
    );
  }

  // Empty (no filters)
  if (status === "success" && (!rows || rows.length === 0)) {
    return (
      <div className={cn("animate-fade-in", className)}>
        <EmptyState
          icon={Inbox}
          title={`No ${resourceLabel} yet`}
          description="Rows will appear here as they get created."
        />
      </div>
    );
  }

  // Data present (potentially with a background revalidate — parent handles
  // the "updating" indicator on the pager). Render children.
  return <div className={cn("animate-fade-in", className)}>{children}</div>;
}
