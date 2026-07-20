import { cn } from "@/lib/utils";

interface FieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
  /** Columns to span inside a DescriptionList grid. `true` = 2 (back-compat). */
  span?: boolean | 2 | 3 | 4;
  className?: string;
}

const spanClass: Record<2 | 3 | 4, string> = {
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
};

/**
 * One label→value recipe, replacing the five drifting overline styles that had
 * accumulated across the detail pages. Label is the shared overline token.
 */
export function Field({ label, children, span, className }: FieldProps) {
  const spanCols = span === true ? 2 : span || undefined;
  return (
    <div className={cn(spanCols && spanClass[spanCols], className)}>
      <dt className="text-overline uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-table text-foreground">{children}</dd>
    </div>
  );
}

interface DescriptionListProps {
  children: React.ReactNode;
  /** Columns at sm+ (default 2). */
  cols?: 1 | 2 | 3;
  className?: string;
}

const colClass: Record<1 | 2 | 3, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
};

export function DescriptionList({
  children,
  cols = 2,
  className,
}: DescriptionListProps) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", colClass[cols], className)}>
      {children}
    </dl>
  );
}
