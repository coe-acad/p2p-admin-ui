import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { Sparkline } from "@/components/ui/Sparkline";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  /** Compact KPI-strip form: smaller value, tighter padding. */
  compact?: boolean;
  /** When set, the card becomes an interactive button and earns its hover lift. */
  onClick?: () => void;
  /** Marks the tile as the currently-active filter in a KPI strip. */
  active?: boolean;
  /** Optional trend sparkline (oldest → newest); shown on non-compact cards. */
  spark?: number[];
  /** Optional % change vs the previous period; renders an arrow + value. */
  deltaPct?: number | null;
  className?: string;
  style?: React.CSSProperties;
}

const tones: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-muted text-muted-foreground ring-border",
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/10 text-warning-strong ring-warning/20",
  danger: "bg-destructive/10 text-destructive ring-destructive/20",
  info: "bg-info/10 text-info ring-info/20",
};

// Sparkline stroke per tone — the design system's own semantic token, softened
// so the line reads as context rather than a second focal point.
const sparkTones: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-muted-foreground/60",
  success: "text-success/70",
  warning: "text-warning-strong/70",
  danger: "text-destructive/70",
  info: "text-info/70",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  compact = false,
  onClick,
  active = false,
  spark,
  deltaPct,
  className,
  style,
}: StatCardProps) {
  const interactive = Boolean(onClick);
  const Comp = interactive ? "button" : "div";

  return (
    <Comp
      type={interactive ? "button" : undefined}
      onClick={onClick}
      style={style}
      className={cn(
        "group relative animate-fade-in overflow-hidden rounded-xl border bg-card text-left shadow-soft transition-all duration-150",
        compact ? "p-4" : "p-5",
        active
          ? "border-primary/40 ring-1 ring-primary/20"
          : "border-border",
        interactive &&
          "focus-ring cursor-pointer hover:border-foreground/20 hover:shadow-elevated",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-overline uppercase text-muted-foreground">{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex items-center justify-center rounded-lg ring-1 ring-inset transition-transform duration-150",
              compact ? "h-7 w-7" : "h-9 w-9",
              interactive && "group-hover:scale-105",
              tones[tone]
            )}
          >
            <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </span>
        )}
      </div>
      <p
        className={cn(
          "nums font-semibold leading-none tracking-tight text-foreground",
          compact ? "mt-2.5 text-xl" : "mt-4 text-[28px]"
        )}
      >
        {value}
      </p>
      {(hint || (deltaPct != null && Number.isFinite(deltaPct))) && (
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs text-muted-foreground",
            compact ? "mt-1.5" : "mt-2"
          )}
        >
          {deltaPct != null && Number.isFinite(deltaPct) && (
            <span className="inline-flex items-center gap-0.5 font-medium tabular-nums text-foreground/70">
              {deltaPct >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(deltaPct) >= 999 ? "999+%" : `${Math.abs(Math.round(deltaPct))}%`}
            </span>
          )}
          {hint && <span className="min-w-0 truncate">{hint}</span>}
        </div>
      )}
      {!compact && spark && spark.length > 1 && (
        <div className="mt-3">
          <Sparkline data={spark} className={sparkTones[tone]} />
        </div>
      )}
    </Comp>
  );
}
