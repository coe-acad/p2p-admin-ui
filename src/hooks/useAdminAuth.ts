import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";

import { auth } from "@/lib/firebase";

export type AdminAuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "not-admin"; user: User }
  | { status: "admin"; user: User; phoneNumber: string | null };

export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>({ status: "loading" });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ status: "signed-out" });
        return;
      }
      try {
        // Force-refresh so a freshly-granted admin claim shows up without
        // requiring the user to sign out + back in.
        const tokenResult = await user.getIdTokenResult(true);
        if (tokenResult.claims.admin === true) {
          setState({
            status: "admin",
            user,
            phoneNumber: user.phoneNumber,
          });
        } else {
          setState({ status: "not-admin", user });
        }
      } catch (error) {
        console.error("[useAdminAuth] failed to read token claims", error);
        setState({ status: "not-admin", user });
      }
    });
    return unsubscribe;
  }, []);

  return state;
}
