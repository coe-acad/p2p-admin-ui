import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

interface BackLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}

/** The single back affordance for every detail page. */
export function BackLink({ to, children, className }: BackLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        "focus-ring -ml-1 mb-5 inline-flex items-center gap-1 rounded px-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
    >
      <ChevronLeft className="h-4 w-4" />
      {children}
    </Link>
  );
}
