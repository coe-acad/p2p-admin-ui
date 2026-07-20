import { type LucideIcon } from "lucide-react";

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

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  compact = false,
  onClick,
  active = false,
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
      {hint && (
        <p className={cn("text-xs text-muted-foreground", compact ? "mt-1.5" : "mt-2")}>
          {hint}
        </p>
      )}
    </Comp>
  );
}
