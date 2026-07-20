import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PackageSearch, RefreshCw, Search, X } from "lucide-react";
import type { ColDef } from "ag-grid-community";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataGrid } from "@/components/ui/DataGrid";
import { GridCard } from "@/components/ui/GridCard";
import { IdCell, TimeCell } from "@/components/ui/cells";
import { ListPageState } from "@/components/ui/ListPageState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager } from "@/components/ui/Pager";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useCursorPager } from "@/hooks/useCursorPager";
import { cn } from "@/lib/utils";
import {
  getCatalog,
  listCatalogs,
  type CatalogRow,
} from "@/services/adminApi";

const statusTabs: Array<{ key: "" | "true" | "false"; label: string }> = [
  { key: "", label: "All" },
  { key: "true", label: "Active" },
  { key: "false", label: "Inactive" },
];

/** Full mobile format the DB stores: "+91XXXXXXXXXX". Accept a 10-digit
 *  local number and prefix +91 for the backend filter. */
const withPrefix = (digits: string): string | undefined => {
  if (!digits) return undefined;
  return digits.length === 10 ? `+91${digits}` : undefined;
};

export function CatalogsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState<"" | "true" | "false">("");

  // Two-state input: `mobileInput` = what user is typing; `submittedMobile`
  // = what gets sent to the backend. Only Enter (or clear) syncs the two,
  // so keystrokes don't trigger network calls.
  const [mobileInput, setMobileInput] = useState("");
  const [submittedMobile, setSubmittedMobile] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filters = useMemo(
    () => ({ is_active: isActive, owner_mobile: submittedMobile }),
    [isActive, submittedMobile]
  );

  const fetcher = useCallback(
    (
      { cursor, limit }: { cursor: string | null; limit: number },
      { signal }: { signal: AbortSignal }
    ) =>
      listCatalogs({
        cursor: cursor ?? undefined,
        limit,
        is_active: isActive === "" ? undefined : isActive === "true",
        owner_mobile: withPrefix(submittedMobile),
        signal,
      }),
    [isActive, submittedMobile]
  );

  const pager = useCursorPager<CatalogRow>({
    resource: "catalogs",
    filters,
    fetcher,
  });

  const submitSearch = () => {
    if (mobileInput.length === 0 || mobileInput.length === 10) {
      setSubmittedMobile(mobileInput);
    }
  };

  const clearMobile = () => {
    setMobileInput("");
    setSubmittedMobile("");
    inputRef.current?.focus();
  };

  // Prefetch full detail on row hover so navigation feels instant.
  const prefetchDetail = useCallback(
    (row: CatalogRow) => {
      queryClient.prefetchQuery({
        queryKey: ["catalog", "detail", row.catalog_id],
        queryFn: ({ signal }) => getCatalog(row.catalog_id, { signal }),
      });
    },
    [queryClient]
  );

  const columns = useMemo<ColDef<CatalogRow>[]>(
    () => [
      {
        headerName: "Catalog",
        field: "catalog_id",
        flex: 1,
        cellRenderer: (p: { data: CatalogRow }) => (
          <IdCell value={p.data.catalog_id} max={22} />
        ),
      },
      {
        headerName: "Seller",
        field: "seller_name",
        flex: 1.2,
        cellRenderer: (p: { data: CatalogRow }) => (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs text-foreground">
              {p.data.seller_name ?? "—"}
            </p>
            {p.data.bpp_id && (
              <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground/70">
                via {p.data.bpp_id}
              </p>
            )}
          </div>
        ),
      },
      {
        headerName: "Owner",
        field: "owner_mobile",
        width: 170,
        cellRenderer: (p: { data: CatalogRow }) =>
          p.data.owner_mobile ? (
            <span className="font-mono text-xs text-foreground/90">
              {p.data.owner_mobile}
            </span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          ),
      },
      {
        headerName: "Offers",
        field: "offer_count",
        width: 120,
        cellRenderer: (p: { data: CatalogRow }) => (
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums font-mono",
              p.data.offer_count > 0
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground/60"
            )}
          >
            {p.data.offer_count}
          </span>
        ),
      },
      {
        headerName: "Status",
        field: "is_active",
        width: 120,
        cellRenderer: (p: { data: CatalogRow }) =>
          p.data.is_active ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="neutral">Inactive</Badge>
          ),
      },
      {
        headerName: "Published",
        field: "created_at",
        width: 200,
        cellRenderer: (p: { data: CatalogRow }) => (
          <TimeCell value={p.data.created_at} />
        ),
      },
    ],
    []
  );

  const hasFilters = isActive !== "" || submittedMobile !== "";
  const clearFilters = () => {
    setIsActive("");
    clearMobile();
  };

  return (
    <div>
      <PageHeader
        title="Catalogs"
        actions={
          <Button
            onClick={() => pager.refetch()}
            variant="secondary"
            disabled={pager.isFetching}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", pager.isFetching && "animate-spin")}
            />
            Refresh
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          tabs={statusTabs}
          value={isActive}
          onChange={setIsActive}
          layoutId="catalogs-status"
        />

        <MobileSearch
          value={mobileInput}
          onChange={setMobileInput}
          onSubmit={submitSearch}
          onClear={clearMobile}
          submitted={submittedMobile}
          inputRef={inputRef}
        />
      </div>

      <ListPageState
        status={
          pager.isError ? "error" : pager.isPending ? "pending" : "success"
        }
        rows={pager.rows}
        error={pager.error}
        onRetry={() => pager.refetch()}
        onClearFilters={hasFilters ? clearFilters : undefined}
        hasFilters={hasFilters}
        resourceLabel="catalogs"
        columns={6}
      >
        <GridCard>
          <DataGrid<CatalogRow>
            rows={pager.rows}
            columns={columns}
            serverPaged
            framed={false}
            fetching={pager.isFetching && !pager.isPending}
            rowKey="catalog_id"
            onRowClick={(row) =>
              navigate(`/catalogs/${encodeURIComponent(row.catalog_id)}`)
            }
            onRowHover={prefetchDetail}
          />
          <Pager
            footer
            page={pager.page}
            pageCount={pager.pageCount}
            pageSize={pager.pageSize}
            onPageSize={pager.setPageSize}
            hasPrev={pager.hasPrev}
            hasNext={pager.hasNext}
            onPrev={pager.prev}
            onNext={pager.next}
            isFetching={pager.isFetching && !pager.isPending}
          />
        </GridCard>
      </ListPageState>

      {pager.rows.length === 0 &&
        !pager.isPending &&
        !pager.isError &&
        !hasFilters && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
          <PackageSearch className="h-3 w-3" />
          Tip: filter by owner mobile to see what a specific seller has
          published.
        </div>
      )}
    </div>
  );
}

// -------- Local pieces ----------------------------------------------------

function MobileSearch({
  value,
  onChange,
  onSubmit,
  onClear,
  submitted,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  submitted: string;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  const dirty = value !== submitted;
  const complete = value.length === 10;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={cn(
        "relative flex items-center rounded-md border bg-card transition-shadow",
        "focus-within:border-primary/60 focus-within:shadow-[0_0_0_3px_hsl(var(--ring)/0.12)]",
        dirty && complete
          ? "border-primary/60 shadow-[0_0_0_3px_hsl(var(--ring)/0.12)]"
          : "border-border"
      )}
    >
      <span className="pointer-events-none flex items-center gap-1 border-r border-border/60 pl-2 pr-2 text-xs text-muted-foreground/80">
        <Search className="h-3.5 w-3.5" />
        <span className="font-mono">+91</span>
      </span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          // Digits only, max 10.
          const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
          onChange(cleaned);
        }}
        placeholder="10-digit mobile · press Enter"
        inputMode="numeric"
        pattern="\d{10}"
        maxLength={10}
        className="w-56 rounded-r-md bg-card py-1.5 pl-2 pr-8 text-xs font-mono text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground/60"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </form>
  );
}
