import { useEffect } from "react";
import { useLocation, Outlet } from "react-router-dom";

import { Sidebar } from "@/components/Sidebar";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useLetterNav } from "@/hooks/useLetterNav";

// Human page name per route prefix, for the browser tab title.
const TITLES: Array<[string, string]> = [
  ["/users", "Users"],
  ["/transactions", "Transactions"],
  ["/catalogs", "Catalogs"],
  ["/payments", "Payments"],
  ["/refunds", "Refunds"],
  ["/audit", "Audit log"],
];

const titleFor = (pathname: string): string => {
  if (pathname === "/") return "Overview";
  const match = TITLES.find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : "Admin";
};

export function DashboardLayout() {
  const state = useAdminAuth();
  const phoneNumber = state.status === "admin" ? state.phoneNumber : null;
  // Vim-style g u/g t/g p/g r/g a jumps between admin sections.
  useLetterNav();
  // Re-trigger page entrance animation when route changes.
  const location = useLocation();

  useEffect(() => {
    document.title = `${titleFor(location.pathname)} · CharzPe Admin`;
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar phoneNumber={phoneNumber} />
      <main className="thin-scroll min-w-0 flex-1 overflow-y-auto">
        <div
          key={location.pathname}
          className="mx-auto max-w-7xl px-6 py-10 animate-fade-in sm:px-10 lg:px-12"
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
