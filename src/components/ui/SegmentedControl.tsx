import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface SegmentedControlProps<K extends string> {
  tabs: ReadonlyArray<{ key: K; label: string }>;
  value: K;
  onChange: (value: K) => void;
  /** Unique id so the sliding thumb animates only within this control. */
  layoutId: string;
  className?: string;
}

/**
 * Low-chroma segmented control — the one filter-pill dialect. A quiet card-
 * colored thumb springs between segments via a shared layoutId, so selection
 * reads as one object moving through the group rather than a repainted slab.
 * Replaces the five near-identical local FilterTabs implementations.
 */
export function SegmentedControl<K extends string>({
  tabs,
  value,
  onChange,
  layoutId,
  className,
}: SegmentedControlProps<K>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-muted/70 p-0.5",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={cn(
              "focus-ring relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <AnimatePresence initial={false}>
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-full bg-card shadow-soft ring-1 ring-border/70"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </AnimatePresence>
            <span className="relative">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
