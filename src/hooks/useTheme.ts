import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "admin-ui-theme";

const readInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* ignore */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

// -- Module-level singleton store --------------------------------------------
// useState is per-instance, so without this every component would see its own
// stale value when ThemeToggle flipped its local state. Module-scoped store
// fans changes out to every subscribed hook.

let currentTheme: Theme = readInitialTheme();
const listeners = new Set<(theme: Theme) => void>();

const applyTheme = (theme: Theme) => {
  if (theme === currentTheme) return;
  currentTheme = theme;
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  listeners.forEach((notify) => notify(theme));
};

/** Subscribes to the shared theme store. Every component using this hook
 * receives updates whenever any other component flips the theme. */
export function useTheme(): {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
} {
  const [theme, setLocal] = useState<Theme>(currentTheme);

  useEffect(() => {
    if (theme !== currentTheme) setLocal(currentTheme);
    listeners.add(setLocal);
    return () => {
      listeners.delete(setLocal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    theme,
    setTheme: applyTheme,
    toggle: () =>
      applyTheme(currentTheme === "dark" ? "light" : "dark"),
  };
}
