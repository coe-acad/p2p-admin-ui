import { forwardRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-overlay/45 backdrop-blur-[2px] transition-opacity",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      "motion-reduce:transition-none",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: "right" | "left" | "top" | "bottom";
  width?: string;
}

const sideClasses = {
  right:
    "inset-y-0 right-0 h-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
  left: "inset-y-0 left-0 h-full border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
  top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
  bottom:
    "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
} as const;

const SheetContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ className, children, side = "right", width, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      style={
        width && (side === "right" || side === "left")
          ? { width }
          : undefined
      }
      className={cn(
        "fixed z-50 flex flex-col bg-card text-foreground shadow-elevated outline-none dark:ring-1 dark:ring-white/10",
        "data-[state=open]:animate-in data-[state=open]:duration-300",
        "data-[state=closed]:animate-out data-[state=closed]:duration-200",
        "motion-reduce:animate-none",
        sideClasses[side],
        (side === "right" || side === "left") && !width && "w-full max-w-xl",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        aria-label="Close"
        className={cn(
          "focus-ring absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground",
          "transition-colors hover:bg-muted hover:text-foreground"
        )}
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col gap-1 border-b border-border px-6 py-5",
      className
    )}
    {...props}
  />
);

const SheetTitle = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-base font-semibold tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-xs text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

const SheetBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("thin-scroll flex-1 overflow-y-auto px-6 py-5", className)}
    {...props}
  />
);

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-6 py-4",
      className
    )}
    {...props}
  />
);

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
};
