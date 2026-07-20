import { Navigate } from "react-router-dom";

import { useAdminAuth } from "@/hooks/useAdminAuth";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const state = useAdminAuth();

  if (state.status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Checking admin access…
      </div>
    );
  }

  if (state.status === "signed-out") {
    return <Navigate to="/login" replace />;
  }

  if (state.status === "not-admin") {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
