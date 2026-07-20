import { useCallback, useMemo, useState } from "react";
import { RefreshCw, Search, X } from "lucide-react";
import type { ColDef } from "ag-grid-community";

import { Button } from "@/components/ui/Button";
import { DataGrid } from "@/components/ui/DataGrid";
import { GridCard } from "@/components/ui/GridCard";
import { IdCell, TimeCell } from "@/components/ui/cells";
import { ListPageState } from "@/components/ui/ListPageState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager } from "@/components/ui/Pager";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatusPill } from "@/components/ui/StatusPill";
import { useCursorPager } from "@/hooks/useCursorPager";
import { cn } from "@/lib/utils";
import { listLedger, type LedgerRow } from "@/services/adminApi";

const roleTabs: Array<{ key: string; label: string }> = [
  { key: "", label: "All" },
  { key: "BUYER", label: "Buyer" },
  { key: "SELLER", label: "Seller" },
];

const qtyOf = (row: LedgerRow): string => {
  const d = row.tradeDetails?.[0];
  if (!d || d.tradeQty == null) return "—";
  return `${d.tradeQty} ${d.tradeUnit ?? "kWh"}`;
};

export function LedgerPage() {
  const [role, setRole] = useState<string>("");
  const [txnInput, setTxnInput] = useState<string>("");
  const [txn, setTxn] = useState<string>("");

  const filters = useMemo(() => ({ role, txn }), [role, txn]);

  const fetcher = useCallback(
    (
      { cursor, limit }: { cursor: string | null; limit: number },
      { signal }: { signal: AbortSignal }
    ) =>
      listLedger({
        cursor: cursor ?? undefined,
        limit,
        role: role || undefined,
        transaction_id: txn || undefined,
        signal,
      }),
    [role, txn]
  );

  const pager = useCursorPager<LedgerRow>({
    resource: "ledger",
    filters,
    fetcher,
  });

  const columns = useMemo<ColDef<LedgerRow>[]>(
    () => [
      {
        headerName: "Txn",
        field: "transactionId",
        flex: 1,
        cellRenderer: (p: { data: LedgerRow }) => (
          <IdCell value={p.data.transactionId} max={22} />
        ),
      },
      {
        headerName: "Role",
        field: "role",
        width: 110,
        cellRenderer: (p: { data: LedgerRow }) => (
          <StatusPill status={p.data.role} />
        ),
      },
      {
        headerName: "Quantity",
        width: 120,
        cellRenderer: (p: { data: LedgerRow }) => (
          <span className="nums text-[13px] font-medium text-foreground">
            {qtyOf(p.data)}
          </span>
        ),
      },
      {
        headerName: "Delivery window",
        width: 210,
        cellRenderer: (p: { data: LedgerRow }) => (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <TimeCell value={p.data.deliveryStartTime} />
            <span className="text-muted-foreground/50">→</span>
            <TimeCell value={p.data.deliveryEndTime} />
          </span>
        ),
      },
      {
        headerName: "Delivery",
        field: "delivery_status",
        width: 120,
        cellRenderer: (p: { data: LedgerRow }) => (
          <StatusPill status={p.data.delivery_status} />
        ),
      },
      {
        headerName: "Settlement",
        field: "settlement_status",
        width: 140,
        cellRenderer: (p: { data: LedgerRow }) => (
          <StatusPill status={p.data.settlement_status} />
        ),
      },
      {
        headerName: "Seller meter",
        field: "sellerId",
        width: 150,
        cellRenderer: (p: { data: LedgerRow }) => (
          <span className="font-mono text-xs text-foreground/90">
            {p.data.sellerId ?? "—"}
          </span>
        ),
      },
      {
        headerName: "Buyer meter",
        field: "buyerId",
        width: 150,
        cellRenderer: (p: { data: LedgerRow }) => (
          <span className="font-mono text-xs text-foreground/90">
            {p.data.buyerId ?? "—"}
          </span>
        ),
      },
      {
        headerName: "Recorded",
        field: "creationTime",
        width: 190,
        cellRenderer: (p: { data: LedgerRow }) => (
          <TimeCell value={p.data.creationTime} />
        ),
      },
    ],
    []
  );

  const hasFilters = role !== "" || txn !== "";

  const clearAll = () => {
    setRole("");
    setTxn("");
    setTxnInput("");
  };

  const submitTxn = (e: React.FormEvent) => {
    e.preventDefault();
    setTxn(txnInput.trim());
  };

  return (
    <div>
      <PageHeader
        eyebrow="Ledger"
        title="Energy ledger"
        description="Authoritative DEG record of every confirmed energy trade — quantity, delivery window, meters."
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SegmentedControl
          tabs={roleTabs}
          value={role}
          onChange={setRole}
          layoutId="ledger-role"
        />
        <form onSubmit={submitTxn} className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={txnInput}
              onChange={(e) => setTxnInput(e.target.value)}
              placeholder="Filter by transaction id"
              className="focus-ring h-9 w-64 rounded-lg border border-input bg-background pl-8 pr-3 text-sm transition-colors hover:border-input/80"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        {hasFilters && (
          <Button variant="ghost" onClick={clearAll}>
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      <ListPageState
        status={
          pager.isError ? "error" : pager.isPending ? "pending" : "success"
        }
        rows={pager.rows}
        error={pager.error}
        onRetry={() => pager.refetch()}
        onClearFilters={hasFilters ? clearAll : undefined}
        hasFilters={hasFilters}
        resourceLabel="ledger records"
        columns={9}
      >
        <GridCard>
          <DataGrid<LedgerRow>
            rows={pager.rows}
            columns={columns}
            serverPaged
            framed={false}
            fetching={pager.isFetching && !pager.isPending}
            rowKey="recordId"
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
    </div>
  );
}
