import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface CopyChipProps {
  /** The full value copied to the clipboard. */
  value: string;
  /** What to render; defaults to a middle-truncated form of `value`. */
  label?: React.ReactNode;
  /** Middle-truncate the default label to this length. */
  max?: number;
  /** Render as a bordered chip (detail headers) vs. bare inline (grid cells). */
  chip?: boolean;
  className?: string;
}

const middleTruncate = (value: string, max: number) =>
  value.length > max
    ? `${value.slice(0, Math.ceil(max / 2))}…${value.slice(-Math.floor(max / 2))}`
    : value;

/**
 * One copy interaction for every mono identifier in the product. Click flips
 * the glyph to a green check for 1.2s and the tooltip to "Copied".
 */
export function CopyChip({
  value,
  label,
  max = 16,
  chip = false,
  className,
}: CopyChipProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = (event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => undefined);
  };

  return (
    <Tooltip
      content={
        copied ? "Copied" : <span className="font-mono">{value}</span>
      }
    >
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          "group inline-flex max-w-full items-center gap-1 font-mono text-xs outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ring/60",
          chip
            ? "rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-foreground/90 hover:border-foreground/20"
            : "rounded text-foreground/90 hover:text-foreground",
          className
        )}
      >
        <span className="truncate">{label ?? middleTruncate(value, max)}</span>
        {copied ? (
          <Check className="h-3 w-3 shrink-0 text-success" />
        ) : (
          <Copy className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-70" />
        )}
      </button>
    </Tooltip>
  );
}
