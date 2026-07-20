import { cn } from "@/lib/utils";

interface GridCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * The bookended ledger shell. Wraps an unframed <DataGrid framed={false} /> and
 * a <Pager footer /> in one rounded, hairline-bordered card so the header strip
 * and the pager footer read as a single machined object — no double border, no
 * detached floating strip.
 */
export function GridCard({ children, className }: GridCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-clip rounded-xl border border-border bg-card shadow-soft",
        className
      )}
    >
      {children}
    </div>
  );
}
