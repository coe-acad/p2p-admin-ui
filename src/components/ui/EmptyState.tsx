import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "default" | "danger" | "success";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
  tone?: Tone;
  /** Render without the outer dashed card (for use inside an existing Card). */
  bare?: boolean;
}

const toneChrome: Record<Tone, { border: string; icon: string }> = {
  default: {
    border: "border-border bg-card/60",
    icon: "bg-secondary text-muted-foreground ring-border",
  },
  danger: {
    border: "border-destructive/30 bg-destructive/[0.03]",
    icon: "bg-destructive/10 text-destructive ring-destructive/20",
  },
  success: {
    border: "border-success/30 bg-success/[0.03]",
    icon: "bg-success/10 text-success ring-success/20",
  },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  action,
  tone = "default",
  bare,
}: EmptyStateProps) {
  const chrome = toneChrome[tone];
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-16 text-center",
        !bare && "rounded-xl border border-dashed",
        !bare && chrome.border,
        className
      )}
    >
      {Icon && (
        <span
          className={cn(
            "mb-1 flex h-12 w-12 items-center justify-center rounded-full ring-1 ring-inset",
            chrome.icon
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </span>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
