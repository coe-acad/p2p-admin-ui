import { cn } from "@/lib/utils";

interface KbdProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}

/** Keyboard shortcut chip. Linear-style. */
export function Kbd({ children, className, size = "sm" }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex select-none items-center justify-center rounded border border-border bg-muted/60 font-mono font-medium text-muted-foreground",
        size === "sm" && "min-w-[18px] px-1 py-[1px] text-[10px]",
        size === "md" && "min-w-[22px] px-1.5 py-0.5 text-[11px]",
        className
      )}
    >
      {children}
    </kbd>
  );
}
