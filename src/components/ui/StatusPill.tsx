import { Badge } from "@/components/ui/Badge";
import { statusLabel } from "@/lib/format";

interface StatusPillProps {
  status: string | null | undefined;
  className?: string;
}

/** Semantic status pill. Delegates label + variant mapping to Badge's
 *  built-in `asStatus` + `statusLabel` from lib/format. */
export function StatusPill({ status, className }: StatusPillProps) {
  return (
    <Badge asStatus={status} className={className}>
      {statusLabel(status)}
    </Badge>
  );
}
