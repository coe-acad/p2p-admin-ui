import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Drawer state synced to `?drawer=<id>`.
 *
 * Additive: opening/closing only touches the `drawer` key, so any cursor,
 * limit, or filter params on the list URL survive. Closing then reopening the
 * same list route restores the exact page + filters + drawer target.
 *
 * @param key allow multiple drawers on one page (e.g. buyer vs seller tabs)
 */
export function useDrawerParam(key = "drawer") {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get(key);
  const isOpen = id != null && id.length > 0;

  const open = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          prev.set(key, value);
          return prev;
        },
        { replace: false }
      );
    },
    [key, setSearchParams]
  );

  const close = useCallback(() => {
    setSearchParams(
      (prev) => {
        prev.delete(key);
        return prev;
      },
      { replace: false }
    );
  }, [key, setSearchParams]);

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) close();
    },
    [close]
  );

  return useMemo(
    () => ({ id, isOpen, open, close, setOpen }),
    [id, isOpen, open, close, setOpen]
  );
}
