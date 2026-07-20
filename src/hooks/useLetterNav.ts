import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Vim-style letter navigation. Type `g` then `u`/`t`/`p`/`r`/`a` within a
 * short window to jump to the matching admin page. Ignored while any input,
 * textarea, or contentEditable element is focused so operators can type
 * search terms without triggering navigation.
 */
export function useLetterNav() {
  const navigate = useNavigate();
  const leaderAt = useRef(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Never intercept while an editable is focused
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      // Modifier combos are for other bindings.
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const now = performance.now();
      const key = event.key.toLowerCase();

      if (key === "g") {
        leaderAt.current = now;
        return;
      }

      // Only act if we saw `g` in the last 900ms.
      if (now - leaderAt.current > 900) return;
      leaderAt.current = 0;

      const routes: Record<string, string> = {
        u: "/users",
        t: "/transactions",
        p: "/payments",
        r: "/refunds",
        c: "/catalogs",
        a: "/audit",
      };
      const target2 = routes[key];
      if (target2) {
        event.preventDefault();
        navigate(target2);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
}
