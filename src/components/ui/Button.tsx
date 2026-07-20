import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "icon" | "iconSm";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  "focus-ring relative inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-[background-color,box-shadow,transform] disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  // Inverted token pair — near-black on cream in light, near-white ink-on-dark
  // in dark. Fixes the white-on-white primary in dark mode.
  primary:
    "bg-foreground text-background shadow-pressable hover:bg-foreground/90 active:translate-y-px",
  secondary:
    "border border-input bg-card text-foreground/90 hover:bg-muted active:bg-secondary",
  ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
  danger:
    "bg-destructive text-destructive-foreground shadow-pressable hover:bg-destructive/90 active:translate-y-px",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-9 px-3.5 text-sm",
  icon: "h-9 w-9 p-0",
  iconSm: "h-7 w-7 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      type = "button",
      loading = false,
      disabled,
      children,
      ...rest
    },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading && (
        <Loader2
          className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
      )}
      {/* Keep the label at reduced opacity next to the spinner so width never
          jumps between idle and loading. */}
      <span
        className={cn(
          "inline-flex items-center gap-1.5",
          loading && "opacity-70"
        )}
      >
        {children}
      </span>
    </button>
  )
);
Button.displayName = "Button";
