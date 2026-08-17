import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet"
  | "neutral";

// Every variant is a token-based tint: `bg-{t}/10 text-{t} ring-{t}/25`, with a
// slightly stronger fill in dark mode. One source of truth per semantic color,
// dark-safe by construction.
const variants: Record<Variant, { wrap: string; dot: string }> = {
  default: {
    wrap: "bg-secondary text-foreground/90 ring-border",
    dot: "bg-muted-foreground/60",
  },
  success: {
    wrap: "bg-success/10 text-success ring-success/25 dark:bg-success/15",
    dot: "bg-success",
  },
  warning: {
    // Fill/dot use the bright amber; text uses the darker text-safe pair.
    wrap: "bg-warning/10 text-warning-strong ring-warning/30 dark:bg-warning/15",
    dot: "bg-warning",
  },
  danger: {
    wrap:
      "bg-destructive/10 text-destructive ring-destructive/25 dark:bg-destructive/15",
    dot: "bg-destructive",
  },
  info: {
    wrap: "bg-info/10 text-info ring-info/25 dark:bg-info/15",
    dot: "bg-info",
  },
  violet: {
    wrap: "bg-violet/10 text-violet ring-violet/25 dark:bg-violet/15",
    dot: "bg-violet",
  },
  neutral: {
    wrap: "bg-muted text-muted-foreground ring-border",
    dot: "bg-muted-foreground/40",
  },
};

const statusToVariant = (status?: string | null): Variant => {
  if (!status) return "neutral";
  const s = status.toUpperCase();
  if (
    s === "CONFIRMED" ||
    s === "PAID" ||
    s === "PROCESSED" ||
    s === "CONFIRMED_TO_BAP" ||
    s === "COMPLETED" ||
    // settlement terminal-success states
    s === "COMPLETE" ||
    s === "RESOLVED"
  ) {
    return "success";
  }
  if (
    s === "PENDING" ||
    s === "INITIATED" ||
    s === "SELECTED" ||
    s === "CONFIRMING" ||
    // settlement / payout in-flight states
    s === "EXECUTING" ||
    s === "QUEUED" ||
    s === "PROCESSING" ||
    // needs an operator's eyes, but not a hard failure
    s === "NEEDS_REVIEW" ||
    // DEG discom delivery states: energy still flowing, or short-delivered
    s === "IN_PROGRESS" ||
    s === "PARTIALLYFULFILLED"
  ) {
    return "warning";
  }
  if (s === "FAILED" || s === "REJECTED" || s === "PARTIAL_STUCK") {
    return "danger";
  }
  // "Money returned" is a successful terminal outcome, not a failure — it gets
  // its own scannable category instead of screaming red.
  if (
    s === "REFUNDED" ||
    s === "PARTIALLY_REFUNDED" ||
    s === "CANCELLED" ||
    s === "REVERSED"
  ) {
    return "violet";
  }
  // Unknown/new backend enums recede as neutral gray, never light up in the
  // interactive color.
  return "neutral";
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  asStatus?: string | null;
  dot?: boolean;
  className?: string;
}

export function Badge({ children, variant, asStatus, dot = true, className }: BadgeProps) {
  const v = variant ?? statusToVariant(asStatus);
  const { wrap, dot: dotColor } = variants[v];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        wrap,
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />}
      {children}
    </span>
  );
}
