import { type LucideIcon } from "lucide-react";

import { CopyChip } from "@/components/ui/CopyChip";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

// Stable hue from a string so an entity always gets the same identicon color.
const hueFrom = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
};

interface ObjectHeaderProps {
  /** Seed for the identicon hue (entity id/phone). */
  seed: string;
  /** Initials rendered in the identicon (falls back to icon). */
  initials?: string;
  icon?: LucideIcon;
  title: React.ReactNode;
  status?: React.ReactNode;
  /** A copyable id chip beneath the title. */
  copyId?: { value: string; label?: React.ReactNode };
  subtitle?: React.ReactNode;
  /** Right-aligned key facts. */
  facts?: Array<{ label: string; value: React.ReactNode }>;
  className?: string;
}

export function ObjectHeader({
  seed,
  initials,
  icon: Icon,
  title,
  status,
  copyId,
  subtitle,
  facts,
  className,
}: ObjectHeaderProps) {
  const { theme } = useTheme();
  const hue = hueFrom(seed);
  const avatarStyle =
    theme === "dark"
      ? { background: `hsl(${hue} 40% 22%)`, color: `hsl(${hue} 70% 78%)` }
      : { background: `hsl(${hue} 52% 92%)`, color: `hsl(${hue} 55% 32%)` };

  return (
    <div
      className={cn(
        "mb-8 flex flex-wrap items-start justify-between gap-4",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        <span
          aria-hidden
          style={avatarStyle}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
        >
          {Icon ? <Icon className="h-5 w-5" /> : (initials ?? "?").slice(0, 2)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-display font-medium tracking-tight text-foreground">
              {title}
            </h1>
            {status}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {copyId && <CopyChip value={copyId.value} label={copyId.label} chip />}
            {subtitle && (
              <span className="text-sm text-muted-foreground">{subtitle}</span>
            )}
          </div>
        </div>
      </div>

      {facts && facts.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-x-8 gap-y-2">
          {facts.map((fact) => (
            <div key={fact.label} className="text-right">
              <p className="text-overline uppercase text-muted-foreground">
                {fact.label}
              </p>
              <p className="mt-0.5 nums text-sm font-medium text-foreground">
                {fact.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
