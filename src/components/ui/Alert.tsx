import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "danger" | "success" | "warning" | "info";

// One token-based tint recipe per tone — dark-safe by construction, replacing
// every hardcoded pastel (bg-rose-50 / bg-emerald-50 / bg-amber-50) that broke
// in dark mode.
const tones: Record<Tone, { wrap: string; icon: LucideIcon }> = {
  danger: {
    wrap: "bg-destructive/10 text-destructive ring-destructive/20 dark:bg-destructive/15",
    icon: XCircle,
  },
  success: {
    wrap: "bg-success/10 text-success ring-success/20 dark:bg-success/15",
    icon: CheckCircle2,
  },
  warning: {
    wrap: "bg-warning/10 text-warning-strong ring-warning/25 dark:bg-warning/15",
    icon: AlertTriangle,
  },
  info: {
    wrap: "bg-info/10 text-info ring-info/20 dark:bg-info/15",
    icon: Info,
  },
};

interface AlertProps {
  tone?: Tone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: LucideIcon | null;
  className?: string;
}

export function Alert({
  tone = "info",
  title,
  children,
  icon,
  className,
}: AlertProps) {
  const { wrap, icon: DefaultIcon } = tones[tone];
  const Icon = icon === null ? null : (icon ?? DefaultIcon);

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex gap-2.5 rounded-lg px-4 py-3 text-sm ring-1 ring-inset",
        wrap,
        className
      )}
    >
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && (
          <div className={cn(title && "mt-0.5 opacity-90")}>{children}</div>
        )}
      </div>
    </div>
  );
}
