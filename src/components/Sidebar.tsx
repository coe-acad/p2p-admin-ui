import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { motion } from "framer-motion";
import {
  Activity,
  BookOpen,
  CreditCard,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Moon,
  Receipt,
  ScrollText,
  Sun,
  Users,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CopyChip } from "@/components/ui/CopyChip";
import { Kbd } from "@/components/ui/Kbd";
import { Modal } from "@/components/ui/Modal";
import { auth } from "@/lib/firebase";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Home", icon: LayoutDashboard, chord: "h", end: true },
      { to: "/users", label: "Users", icon: Users, chord: "u" },
      { to: "/transactions", label: "Transactions", icon: Activity, chord: "t" },
      { to: "/catalogs", label: "Catalogs", icon: LayoutList, chord: "c" },
    ],
  },
  {
    label: "Money",
    items: [
      { to: "/payments", label: "Payments", icon: CreditCard, chord: "p" },
      { to: "/refunds", label: "Refunds", icon: Receipt, chord: "r" },
      { to: "/settlements", label: "Settlements", icon: Wallet, chord: "s" },
      { to: "/ledger", label: "Ledger", icon: BookOpen, chord: "l" },
    ],
  },
  {
    label: "System",
    items: [{ to: "/audit", label: "Audit log", icon: ScrollText, chord: "a" }],
  },
] as const;

// Environment ribbon — operators must always know which environment they're in.
const ENV = import.meta.env.MODE;
const ENV_LABEL =
  ENV === "production" ? "PROD" : ENV === "staging" ? "STAGING" : "DEV";
const ENV_IS_PROD = ENV === "production";

interface SidebarProps {
  phoneNumber: string | null;
}

export function Sidebar({ phoneNumber }: SidebarProps) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } finally {
      setSigningOut(false);
      setConfirmOpen(false);
    }
  };

  const phoneInitials = (phoneNumber ?? "AD").slice(-2);

  return (
    <aside className="sticky top-0 flex h-screen w-[252px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* ---------- Brand row ---------------------------------- */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <img
          src="/logo.svg"
          alt="CharzPe"
          className="h-8 w-8 object-contain dark:invert dark:hue-rotate-180"
        />
        <div className="leading-tight">
          <p className="font-display text-[15px] font-medium tracking-tight text-foreground">
            CharzPe
          </p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
            Admin console
          </p>
        </div>
        <span
          className={cn(
            "ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
            ENV_IS_PROD
              ? "bg-warning/10 text-warning-strong ring-1 ring-inset ring-warning/25"
              : "bg-muted text-muted-foreground ring-1 ring-inset ring-border"
          )}
          title={`Environment: ${ENV_LABEL}`}
        >
          {ENV_LABEL}
        </span>
      </div>

      {/* ---------- Nav ---------------------------------------- */}
      <nav className="thin-scroll flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-1">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const { to, label, icon: Icon, chord } = item;
                const end = "end" in item ? item.end : undefined;
                return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "focus-ring group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-foreground/75 hover:bg-sidebar-accent hover:text-foreground"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Tinted active fill + a rail that glides between items */}
                      {isActive && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-0 rounded-lg bg-primary/[0.08] dark:bg-primary/15"
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        />
                      )}
                      {isActive && (
                        <motion.span
                          layoutId="nav-rail"
                          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        />
                      )}
                      <Icon
                        className={cn(
                          "relative h-4 w-4 transition-colors",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground/60 group-hover:text-foreground"
                        )}
                      />
                      <span className="relative">{label}</span>
                      {/* Reveal the keyboard chord on hover — advertises the
                          existing vim-style letter nav. */}
                      <span className="relative ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <Kbd>g</Kbd>
                        <Kbd>{chord}</Kbd>
                      </span>
                    </>
                  )}
                </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ---------- Footer profile menu ----------------------- */}
      <div className="border-t border-sidebar-border p-3">
        <ProfileMenu
          phoneNumber={phoneNumber}
          initials={phoneInitials}
          onSignOut={() => setConfirmOpen(true)}
        />
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => !signingOut && setConfirmOpen(false)}
        title="Sign out of CharzPe admin?"
        description="You'll need to verify a phone OTP again to come back in."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={signingOut}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleSignOut} loading={signingOut}>
              Sign out
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-[12px] font-semibold text-primary">
            {phoneInitials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {phoneNumber ?? "Signed in"}
            </p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-success">
              Admin
            </p>
          </div>
        </div>
      </Modal>
    </aside>
  );
}

function ProfileMenu({
  phoneNumber,
  initials,
  onSignOut,
}: {
  phoneNumber: string | null;
  initials: string;
  onSignOut: () => void;
}) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="focus-ring flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-foreground/15 data-[state=open]:border-foreground/20"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-[12px] font-semibold text-primary">
            {initials}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-semibold text-foreground">
              {phoneNumber ?? "Signed in"}
            </p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Admin
            </p>
          </div>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={8}
          className={cn(
            "z-50 w-[228px] rounded-xl border border-border bg-popover p-1 shadow-elevated dark:ring-1 dark:ring-white/10",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "motion-reduce:animate-none"
          )}
        >
          <div className="px-2 py-1.5">
            {phoneNumber ? (
              // Same click-to-copy → green-tick affordance used for every id in
              // the app, instead of a separate "Copy phone" menu row.
              <CopyChip value={phoneNumber} className="text-xs" />
            ) : (
              <p className="truncate font-mono text-xs text-foreground">
                Signed in
              </p>
            )}
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Signed in as admin
            </p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <MenuItem
            icon={isDark ? Sun : Moon}
            onSelect={(e) => {
              // Keep the menu open so the theme change is visible.
              e.preventDefault();
              toggle();
            }}
          >
            {isDark ? "Light mode" : "Dark mode"}
          </MenuItem>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <MenuItem icon={LogOut} danger onSelect={onSignOut}>
            Sign out
          </MenuItem>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onSelect,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onSelect: (event: Event) => void;
  danger?: boolean;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm outline-none transition-colors",
        "data-[highlighted]:bg-muted",
        danger
          ? "text-destructive data-[highlighted]:bg-destructive/10"
          : "text-foreground/90"
      )}
    >
      <Icon className="h-4 w-4 opacity-80" />
      {children}
    </DropdownMenu.Item>
  );
}
