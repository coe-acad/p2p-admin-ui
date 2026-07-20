import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("shimmer-bg animate-shimmer rounded-md", className)} />;
}

interface SkeletonRowsProps {
  rows?: number;
  columns?: number;
  /** Render without the outer card chrome (for use inside an existing Card). */
  bare?: boolean;
}

// Deterministic, uneven bar widths so the skeleton reads like a real table
// rather than a perfectly-uniform placeholder.
const CELL_WIDTHS = ["w-32", "w-20", "w-24", "w-16", "w-28", "w-14"];

export function SkeletonRows({ rows = 8, columns = 5, bare }: SkeletonRowsProps) {
  const body = (
    <>
      {/* header strip — matches the grid's bg-muted/55 so the swap to real
          data doesn't visibly jump */}
      <div className="flex h-[38px] items-center gap-6 border-b border-border bg-muted/55 px-4">
        {Array.from({ length: columns }).map((_, idx) => (
          <Skeleton key={idx} className="h-2.5 w-16" />
        ))}
      </div>
      <div>
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="flex h-10 items-center gap-6 border-b border-border/60 px-4 last:border-b-0"
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn("h-3", CELL_WIDTHS[c % CELL_WIDTHS.length])}
              />
            ))}
          </div>
        ))}
      </div>
      {/* footer strip — placeholder for the integrated pager so nothing pops
          in late when data lands */}
      <div className="h-11 border-t border-border bg-muted/55" />
    </>
  );

  if (bare) return body;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      {body}
    </div>
  );
}

/** Layout-true skeleton for the entity detail pages: a headline strip of stat
 *  tiles over two card-shaped blocks. */
export function DetailSkeleton({ tiles = 4 }: { tiles?: number }) {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: tiles }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5 shadow-soft"
          >
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-3 h-7 w-24" />
          </div>
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-5 shadow-soft"
        >
          <Skeleton className="mb-4 h-4 w-32" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((__, j) => (
              <div key={j} className="space-y-1.5">
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
