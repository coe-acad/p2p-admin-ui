import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import type { Paged } from "@/services/adminApi";

export interface CursorPageFetcher<T> {
  (
    args: { cursor: string | null; limit: number },
    opts: { signal: AbortSignal }
  ): Promise<Paged<T>>;
}

interface UseCursorPagerOptions<T> {
  /** stable resource name for the query key ("audit", "users", ...) */
  resource: string;
  /** filters — object gets JSON-stringified into the key. Changing this
   *  resets the cursor stack. */
  filters: Record<string, unknown>;
  /** default page size */
  initialPageSize?: number;
  fetcher: CursorPageFetcher<T>;
  /** disable the query (e.g. tab not active) */
  enabled?: boolean;
}

interface UseCursorPagerResult<T> {
  rows: T[];
  page: number;
  pageSize: number;
  setPageSize: (n: number) => void;
  hasPrev: boolean;
  hasNext: boolean;
  next: () => void;
  prev: () => void;
  reset: () => void;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  pageCount: number; // rows on current page (from server)
}

const stableStringify = (obj: Record<string, unknown>): string => {
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined && obj[k] !== "" && obj[k] !== null)
    .sort();
  return JSON.stringify(
    keys.reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = obj[k];
      return acc;
    }, {})
  );
};

/**
 * Cursor-based pager backed by TanStack Query.
 *
 * - Each (filters × cursor × pageSize) tuple is its own query key, so Prev is
 *   free (cache hit) once you've visited a page.
 * - Filter change → cursor stack cleared, back to page 1.
 * - Prefetches the next page silently the moment `has_next` becomes true, so
 *   the Next click is instant.
 * - AbortSignal is passed through so an in-flight fetch cancels when filters
 *   change mid-air.
 */
export function useCursorPager<T>({
  resource,
  filters,
  initialPageSize = 25,
  fetcher,
  enabled = true,
}: UseCursorPagerOptions<T>): UseCursorPagerResult<T> {
  const queryClient = useQueryClient();

  const filterHash = useMemo(() => stableStringify(filters), [filters]);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [cursor, setCursor] = useState<string | null>(null);
  const stackRef = useRef<Array<string | null>>([]);
  const [page, setPage] = useState(1);

  // Filter change → reset everything.
  const prevFilterHash = useRef(filterHash);
  useEffect(() => {
    if (prevFilterHash.current !== filterHash) {
      prevFilterHash.current = filterHash;
      stackRef.current = [];
      setCursor(null);
      setPage(1);
    }
  }, [filterHash]);

  const queryKey: QueryKey = useMemo(
    () => [resource, "list", filterHash, pageSize, cursor],
    [resource, filterHash, pageSize, cursor]
  );

  const query = useQuery({
    queryKey,
    enabled,
    queryFn: async ({ signal }) =>
      fetcher({ cursor, limit: pageSize }, { signal }),
    placeholderData: (previous) => previous,
  });

  const hasNext = Boolean(query.data?.has_next);
  const nextCursor = query.data?.next_cursor ?? null;
  const hasPrev = stackRef.current.length > 0;

  // Silent prefetch of the next page.
  useEffect(() => {
    if (!hasNext || !nextCursor) return;
    const key: QueryKey = [
      resource,
      "list",
      filterHash,
      pageSize,
      nextCursor,
    ];
    queryClient.prefetchQuery({
      queryKey: key,
      queryFn: async ({ signal }) =>
        fetcher({ cursor: nextCursor, limit: pageSize }, { signal }),
    });
  }, [
    hasNext,
    nextCursor,
    resource,
    filterHash,
    pageSize,
    fetcher,
    queryClient,
  ]);

  const next = useCallback(() => {
    if (!hasNext || !nextCursor) return;
    stackRef.current = [...stackRef.current, cursor];
    setCursor(nextCursor);
    setPage((p) => p + 1);
  }, [hasNext, nextCursor, cursor]);

  const prev = useCallback(() => {
    const stack = stackRef.current;
    if (stack.length === 0) return;
    const previousCursor = stack[stack.length - 1];
    stackRef.current = stack.slice(0, -1);
    setCursor(previousCursor);
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const reset = useCallback(() => {
    stackRef.current = [];
    setCursor(null);
    setPage(1);
  }, []);

  const setPageSize = useCallback((n: number) => {
    stackRef.current = [];
    setCursor(null);
    setPage(1);
    setPageSizeState(n);
  }, []);

  const rows = query.data?.items ?? [];

  return {
    rows,
    page,
    pageSize,
    setPageSize,
    hasPrev,
    hasNext,
    next,
    prev,
    reset,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    pageCount: query.data?.page_count ?? rows.length,
  };
}
