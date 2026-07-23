import { cn } from "@/lib/utils";

interface SparklineProps {
  /** Daily (or per-bucket) values, oldest → newest. */
  data: number[];
  /** Height in px; width fills the container. */
  height?: number;
  /** Colour via a text-* token (drives currentColor for stroke + fill). */
  className?: string;
}

/**
 * Recessive single-series trend line for a stat tile — thin 1.5px stroke over a
 * faint area, with a dot on the latest point. No axes, legend, or per-point
 * labels (the tile's number carries the value; this carries the shape). Stroke
 * stays crisp under non-uniform scaling via vector-effect.
 */
export function Sparkline({ data, height = 30, className }: SparklineProps) {
  const clean = data.filter((n) => Number.isFinite(n));
  if (clean.length < 2) return null;

  const W = 100;
  const H = height;
  const pad = 2;
  const max = Math.max(...clean);
  const min = Math.min(...clean);
  const span = max - min || 1;

  const pts = clean.map((v, i) => {
    const x = (i / (clean.length - 1)) * W;
    const y = H - pad - ((v - min) / span) * (H - pad * 2);
    return [x, y] as const;
  });

  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      aria-hidden
      className={cn("block overflow-visible text-muted-foreground", className)}
    >
      <path d={area} fill="currentColor" fillOpacity={0.1} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
