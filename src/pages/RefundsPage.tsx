import { useCallback, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { ColDef } from "ag-grid-community";

import { Button } from "@/components/ui/Button";
import { DataGrid } from "@/components/ui/DataGrid";
import { GridCard } from "@/components/ui/GridCard";
import { IdCell, MoneyCell, TimeCell } from "@/components/ui/cells";
import { ListPageState } from "@/components/ui/ListPageState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager } from "@/components/ui/Pager";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatusPill } from "@/components/ui/StatusPill";
import { useCursorPager } from "@/hooks/useCursorPager";
import { moneyColumn } from "@/lib/columns";
import { fmtPaise } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listRefunds, type RefundRow } from "@/services/adminApi";

const statusTabs: Array<{ key: string; label: string }> = [
  { key: "", label: "All" },
  { key: "INITIATED", label: "Initiated" },
  { key: "PROCESSED", label: "Processed" },
  { key: "FAILED", label: "Failed" },
];

const refundRowClass = (row: RefundRow): string | undefined => {
  const s = (row.status ?? "").toUpperCase();
  if (s === "FAILED") return "atria-row-danger";
  if (s === "INITIATED") return "atria-row-warning";
  return undefined;
};

export function RefundsPage() {
  const [status, setStatus] = useState<string>("");

  const filters = useMemo(() => ({ status }), [status]);

  const fetcher = useCallback(
    (
      { cursor, limit }: { cursor: string | null; limit: number },
      { signal }: { signal: AbortSignal }
    ) =>
      listRefunds({
        cursor: cursor ?? undefined,
        limit,
        status: status || undefined,
        signal,
      }),
    [status]
  );

  const pager = useCursorPager<RefundRow>({
    resource: "refunds",
    filters,
    fetcher,
  });

  const columns = useMemo<ColDef<RefundRow>[]>(
    () => [
      {
        headerName: "Refund",
        field: "razorpay_refund_id",
        flex: 1,
        cellRenderer: (p: { data: RefundRow }) => (
          <IdCell value={p.data.razorpay_refund_id} max={22} />
        ),
      },
      {
        headerName: "Buyer",
        field: "buyer_phone",
        width: 170,
        cellRenderer: (p: { data: RefundRow }) =>
          p.data.buyer_phone ? (
            <span className="font-mono text-xs text-foreground/90">
              {p.data.buyer_phone}
            </span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          ),
      },
      moneyColumn({
        headerName: "Amount",
        field: "amount_paise",
        width: 150,
        cellRenderer: (p: { data: RefundRow }) => (
          <MoneyCell paise={p.data.amount_paise} currency={p.data.currency} />
        ),
      }),
      {
        headerName: "Status",
        field: "status",
        width: 150,
        cellRenderer: (p: { data: RefundRow }) => (
          <StatusPill status={p.data.status} />
        ),
      },
      {
        headerName: "Reason",
        field: "reason",
        flex: 1.4,
        cellRenderer: (p: { data: RefundRow }) => (
          <span className="truncate text-xs text-muted-foreground">
            {p.data.reason ?? "—"}
          </span>
        ),
      },
      {
        headerName: "By",
        field: "admin_phone",
        width: 170,
        cellRenderer: (p: { data: RefundRow }) => (
          <span className="font-mono text-xs text-foreground/90">
            {p.data.admin_phone ?? "—"}
          </span>
        ),
      },
      {
        headerName: "Initiated",
        field: "created_at",
        width: 200,
        cellRenderer: (p: { data: RefundRow }) => (
          <TimeCell value={p.data.created_at} />
        ),
      },
    ],
    []
  );

  const hasFilters = status !== "";

  const pageSum = useMemo(
    () => pager.rows.reduce((sum, r) => sum + (r.amount_paise ?? 0), 0),
    [pager.rows]
  );

  return (
    <div>
      <PageHeader
        title="Refunds"
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

      <div className="mb-4">
        <SegmentedControl
          tabs={statusTabs}
          value={status}
          onChange={setStatus}
          layoutId="refunds-status"
        />
      </div>

      <ListPageState
        status={
          pager.isError ? "error" : pager.isPending ? "pending" : "success"
        }
        rows={pager.rows}
        error={pager.error}
        onRetry={() => pager.refetch()}
        onClearFilters={hasFilters ? () => setStatus("") : undefined}
        hasFilters={hasFilters}
        resourceLabel="refunds"
        columns={7}
      >
        <GridCard>
          <DataGrid<RefundRow>
            rows={pager.rows}
            columns={columns}
            serverPaged
            framed={false}
            fetching={pager.isFetching && !pager.isPending}
            rowKey="razorpay_refund_id"
            getRowClass={refundRowClass}
          />
          <Pager
            footer
            note={
              pager.rows.length > 0 ? (
                <>
                  · <span className="font-medium text-foreground">{fmtPaise(pageSum)}</span> on this page
                </>
              ) : undefined
            }
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
    </div>
  );
}
