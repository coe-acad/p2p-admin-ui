import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  padded?: boolean;
}

export function Card({
  children,
  className,
  title,
  description,
  actions,
  padded = true,
}: CardProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-soft",
        className
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && "p-5")}>{children}</div>
    </section>
  );
}
