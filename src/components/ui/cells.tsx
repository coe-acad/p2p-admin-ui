import { CopyChip } from "@/components/ui/CopyChip";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// IdCell — monospace, truncated middle, click to copy (with green-check
// feedback via the shared CopyChip).
// ---------------------------------------------------------------------------

interface IdCellProps {
  value: string | null | undefined;
  max?: number;
  className?: string;
}

export function IdCell({ value, max = 14, className }: IdCellProps) {
  if (!value) {
    return <span className="text-muted-foreground/60">—</span>;
  }
  return <CopyChip value={value} max={max} className={className} />;
}

// ---------------------------------------------------------------------------
// TimeCell — compact "MMM DD · HH:mm" + full ISO on hover
// ---------------------------------------------------------------------------

interface TimeCellProps {
  value: string | null | undefined;
  className?: string;
  showYear?: boolean;
}

const fmtRel = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return "";
};

export function TimeCell({ value, className, showYear }: TimeCellProps) {
  if (!value) {
    return <span className="text-muted-foreground/60">—</span>;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return <span className="text-muted-foreground">{value}</span>;
  }
  const now = new Date();
  const showYearFinal = showYear ?? date.getFullYear() !== now.getFullYear();
  const short = date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    ...(showYearFinal && { year: "2-digit" }),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const rel = fmtRel(value);
  const full = date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <Tooltip
      content={
        <div className="space-y-0.5 text-[11px]">
          <div className="font-mono">{full}</div>
          <div className="text-muted-foreground">ISO {value}</div>
        </div>
      }
    >
      <span
        className={cn(
          "inline-flex items-baseline gap-1.5 whitespace-nowrap font-mono text-xs text-foreground/90",
          className
        )}
      >
        {short}
        {rel && (
          <span className="text-[10px] text-muted-foreground/70">· {rel}</span>
        )}
      </span>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// MoneyCell — right-aligned tabular, muted currency symbol
// ---------------------------------------------------------------------------

interface MoneyCellProps {
  paise?: number | null;
  rupees?: number | null;
  currency?: string | null;
  className?: string;
}

export function MoneyCell({
  paise,
  rupees,
  currency = "INR",
  className,
}: MoneyCellProps) {
  const value =
    paise != null
      ? paise / 100
      : rupees != null
        ? rupees
        : null;
  if (value == null) {
    return <span className="text-muted-foreground/60">—</span>;
  }
  const formatted = value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = currency === "INR" ? "₹" : (currency ?? "");
  return (
    <span
      className={cn(
        "inline-flex items-baseline justify-end gap-0.5 tabular-nums text-[13px] font-medium text-foreground",
        className
      )}
    >
      <span className="text-muted-foreground/60">{symbol}</span>
      {formatted}
    </span>
  );
}
