import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/firebase";

export function UnauthorizedPage() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[640px] -translate-x-1/2 rounded-full bg-destructive/10 blur-3xl dark:bg-destructive/15" />

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-elevated">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-8 ring-destructive/5">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
            Not authorized
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This number is signed in but doesn't have admin privileges. Contact
            an existing admin to be granted access.
          </p>
          <Button variant="primary" className="mt-6 w-full" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
