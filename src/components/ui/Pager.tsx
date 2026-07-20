import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { Kbd } from "@/components/ui/Kbd";
import { cn } from "@/lib/utils";

interface PagerProps {
  page: number; // 1-indexed for display
  pageCount: number; // rows on the current page
  pageSize: number;
  onPageSize: (size: number) => void;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  isFetching?: boolean;
  className?: string;
  pageSizeOptions?: number[];
  /** Render as the grid card's footer (bg-muted strip) rather than a floating
   *  sticky bar. */
  footer?: boolean;
  /** Extra readout on the left, e.g. a page-sum on money grids. */
  note?: React.ReactNode;
}

const DEFAULT_SIZES = [25, 50, 100];

const isEditable = (el: EventTarget | null): boolean => {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    node.isContentEditable
  );
};

/** Cursor pager. No jump-to-page (unknown total), just Prev/Next + size. */
export function Pager({
  page,
  pageCount,
  pageSize,
  onPageSize,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  isFetching,
  className,
  pageSizeOptions = DEFAULT_SIZES,
  footer = false,
  note,
}: PagerProps) {
  // Wire the advertised ← / → shortcuts (the Kbd chips used to be a false
  // affordance). Ignored while an editable element is focused.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditable(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowLeft" && hasPrev && !isFetching) {
        event.preventDefault();
        onPrev();
      } else if (event.key === "ArrowRight" && hasNext && !isFetching) {
        event.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasPrev, hasNext, isFetching, onPrev, onNext]);

  const start = pageCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const end = pageCount > 0 ? start + pageCount - 1 : 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 text-xs",
        footer
          ? "h-11 border-t border-border bg-muted/55"
          : "sticky bottom-0 z-10 border-t border-border bg-card/95 py-2.5 backdrop-blur",
        className
      )}
    >
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="tabular-nums">
          {pageCount > 0 ? (
            <>
              Rows{" "}
              <span className="font-medium text-foreground">
                {start}–{end}
              </span>
            </>
          ) : (
            "No rows"
          )}
        </span>
        {note && <span className="tabular-nums text-muted-foreground">{note}</span>}
        {isFetching && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground/80">
            <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" />
            updating
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-muted-foreground">
          <span className="hidden sm:inline">Rows</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="focus-ring rounded-md border border-border bg-card px-1.5 py-1 text-xs text-foreground"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <PagerButton
            onClick={onPrev}
            disabled={!hasPrev || isFetching}
            label="Previous"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </PagerButton>
          <PagerButton
            onClick={onNext}
            disabled={!hasNext || isFetching}
            label="Next"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </PagerButton>
        </div>

        <div className="ml-1 hidden items-center gap-1 border-l border-border pl-2 text-[10px] text-muted-foreground/70 md:flex">
          <Kbd>←</Kbd>
          <Kbd>→</Kbd>
        </div>
      </div>
    </div>
  );
}

function PagerButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.09 }}
      className={cn(
        "focus-ring inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground/90",
        "transition-colors hover:bg-muted",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card"
      )}
    >
      {children}
    </motion.button>
  );
}
