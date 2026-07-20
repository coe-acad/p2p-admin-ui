import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import type { ColDef } from "ag-grid-community";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataGrid } from "@/components/ui/DataGrid";
import { GridCard } from "@/components/ui/GridCard";
import { IdCell, TimeCell } from "@/components/ui/cells";
import { Kbd } from "@/components/ui/Kbd";
import { ListPageState } from "@/components/ui/ListPageState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager } from "@/components/ui/Pager";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import { useCursorPager } from "@/hooks/useCursorPager";
import { useDrawerParam } from "@/hooks/useDrawerParam";
import { statusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listAudit, type AuditRow } from "@/services/adminApi";

const auditFetcher = ({
  cursor,
  limit,
  admin_uid,
  action,
  target_type,
}: {
  cursor: string | null;
  limit: number;
  admin_uid?: string;
  action?: string;
  target_type?: string;
}) =>
  ({ signal }: { signal: AbortSignal }) =>
    listAudit({
      cursor: cursor ?? undefined,
      limit,
      admin_uid: admin_uid || undefined,
      action: action || undefined,
      target_type: target_type || undefined,
      signal,
    });

// Debounce filter inputs so typing doesn't strobe the progress bar / churn
// rows on every keystroke.
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function AuditPage() {
  const [adminUid, setAdminUid] = useState("");
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");

  const dAdminUid = useDebounced(adminUid, 350);
  const dAction = useDebounced(action, 350);
  const dTargetType = useDebounced(targetType, 350);

  const filters = useMemo(
    () => ({ admin_uid: dAdminUid, action: dAction, target_type: dTargetType }),
    [dAdminUid, dAction, dTargetType]
  );

  const fetcher = useCallback(
    ({ cursor, limit }: { cursor: string | null; limit: number }, opts: { signal: AbortSignal }) =>
      auditFetcher({ cursor, limit, ...filters })(opts),
    [filters]
  );

  const pager = useCursorPager<AuditRow>({
    resource: "audit",
    filters,
    fetcher,
  });

  const drawer = useDrawerParam();
  const selected = useMemo(
    () => (drawer.id ? pager.rows.find((r) => r.action_id === drawer.id) : null),
    [drawer.id, pager.rows]
  );

  const hasFilters = adminUid.length > 0 || action.length > 0 || targetType.length > 0;
  const clearFilters = () => {
    setAdminUid("");
    setAction("");
    setTargetType("");
  };

  const columns = useMemo<ColDef<AuditRow>[]>(
    () => [
      {
        headerName: "When",
        field: "created_at",
        width: 190,
        cellRenderer: (p: { data: AuditRow }) => (
          <TimeCell value={p.data.created_at} />
        ),
      },
      {
        headerName: "Action",
        field: "action",
        width: 200,
        cellRenderer: (p: { data: AuditRow }) => (
          <Badge variant="neutral">{statusLabel(p.data.action)}</Badge>
        ),
      },
      {
        headerName: "Target",
        field: "target_id",
        flex: 1.3,
        cellRenderer: (p: { data: AuditRow }) => (
          <div className="min-w-0 leading-tight">
            <p className="text-overline uppercase text-muted-foreground/70">
              {p.data.target_type}
            </p>
            <IdCell value={p.data.target_id} max={24} />
          </div>
        ),
      },
      {
        headerName: "Operator",
        field: "admin_phone",
        width: 210,
        cellRenderer: (p: { data: AuditRow }) => (
          <div className="min-w-0 leading-tight">
            <p className="text-xs text-foreground/90">
              {p.data.admin_phone ?? "—"}
            </p>
            <IdCell value={p.data.admin_uid} max={16} />
          </div>
        ),
      },
      {
        headerName: "Reason",
        field: "reason",
        flex: 1,
        cellRenderer: (p: { data: AuditRow }) => (
          <span className="truncate text-xs text-muted-foreground">
            {p.data.reason ?? "—"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Audit log"
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

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterInput
          value={action}
          onChange={setAction}
          placeholder="Filter by action…"
          onClear={() => setAction("")}
        />
        <FilterInput
          value={targetType}
          onChange={setTargetType}
          placeholder="Filter by target type…"
          onClear={() => setTargetType("")}
        />
        <FilterInput
          value={adminUid}
          onChange={setAdminUid}
          placeholder="Filter by admin uid…"
          onClear={() => setAdminUid("")}
        />
        {hasFilters && (
          <motion.button
            layout
            type="button"
            onClick={clearFilters}
            className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear all
          </motion.button>
        )}
        <div className="ml-auto hidden items-center gap-1 text-[10px] text-muted-foreground/70 md:flex">
          <Kbd>g</Kbd>
          <Kbd>a</Kbd>
          <span>jump here</span>
        </div>
      </div>

      <ListPageState
        status={pager.isError ? "error" : pager.isPending ? "pending" : "success"}
        rows={pager.rows}
        error={pager.error}
        onRetry={() => pager.refetch()}
        onClearFilters={hasFilters ? clearFilters : undefined}
        hasFilters={hasFilters}
        resourceLabel="audit rows"
        columns={5}
      >
        <GridCard>
          <DataGrid<AuditRow>
            rows={pager.rows}
            columns={columns}
            serverPaged
            framed={false}
            fetching={pager.isFetching && !pager.isPending}
            rowKey="action_id"
            onRowClick={(row) => drawer.open(row.action_id)}
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

      <Sheet open={drawer.isOpen} onOpenChange={drawer.setOpen}>
        <SheetContent width="640px">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{statusLabel(selected.action)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    <TimeCell value={selected.created_at} />
                  </span>
                </div>
                <SheetTitle>{selected.target_type} · {selected.target_id}</SheetTitle>
                <SheetDescription>
                  by {selected.admin_phone ?? selected.admin_uid}
                </SheetDescription>
              </SheetHeader>
              <SheetBody>
                <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-xs">
                  <Row label="Action id" value={selected.action_id} mono />
                  <Row label="Request id" value={selected.request_id} mono />
                  <Row label="Admin uid" value={selected.admin_uid} mono />
                  <Row
                    label="Reason"
                    value={selected.reason ?? "—"}
                    className="col-span-3"
                  />
                </dl>
                <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <JsonBlock label="Before" value={selected.before} />
                  <JsonBlock label="After" value={selected.after} />
                </div>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ------- Local helpers ----------------------------------------------------

function FilterInput({
  value,
  onChange,
  placeholder,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onClear: () => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "focus-ring w-56 rounded-md border border-border bg-card py-1.5 pl-7 pr-7 text-xs text-foreground placeholder:text-muted-foreground/60",
          "transition-shadow focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.15)]"
        )}
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
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 break-all text-xs text-foreground",
          mono && "font-mono"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function JsonBlock({
  label,
  value,
}: {
  label: string;
  value: Record<string, unknown> | null;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </p>
      <pre className="thin-scroll max-h-72 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground/90">
        {value ? JSON.stringify(value, null, 2) : "—"}
      </pre>
    </div>
  );
}
