import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export function ThemeToggle({ className, compact = false }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className
        )}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "focus-ring inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted",
        className
      )}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
