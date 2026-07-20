import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, ShoppingBag, Store } from "lucide-react";
import type { ColDef } from "ag-grid-community";

import { Badge } from "@/components/ui/Badge";
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
import { fmtAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  listOrders,
  listTrades,
  type OrderRow,
  type TradeRow,
} from "@/services/adminApi";

type View = "buyer" | "seller";

const buyerStateTabs: Array<{ key: string; label: string }> = [
  { key: "", label: "All" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "INITIATED", label: "Initiated" },
  { key: "SELECTED", label: "Selected" },
];

const sellerStateTabs: Array<{ key: string; label: string }> = [
  { key: "", label: "All" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "INITIATED", label: "Initiated" },
  { key: "SELECTED", label: "Selected" },
  { key: "REFUNDED", label: "Refunded" },
  { key: "FAILED", label: "Failed" },
];

const stateRowClass = (state: string | null | undefined): string | undefined => {
  const s = (state ?? "").toUpperCase();
  if (s === "FAILED") return "atria-row-danger";
  if (s === "INITIATED") return "atria-row-warning";
  return undefined;
};

export function TransactionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Seller view is the default (BPP-side trades are the primary ops surface).
  const view: View = searchParams.get("view") === "buyer" ? "buyer" : "seller";

  const setView = (next: View) => {
    setSearchParams((prev) => {
      prev.set("view", next);
      return prev;
    });
  };

  const [buyerState, setBuyerState] = useState<string>("");
  const [sellerState, setSellerState] = useState<string>("");

  return (
    <div>
      <PageHeader title="Transactions" />

      <ViewToggle view={view} setView={setView} />

      {view === "buyer" ? (
        <BuyerList
          state={buyerState}
          setState={setBuyerState}
          onOpen={(id) =>
            navigate(`/transactions/buyer/${encodeURIComponent(id)}`)
          }
        />
      ) : (
        <SellerList
          state={sellerState}
          setState={setSellerState}
          onOpen={(id) =>
            navigate(`/transactions/seller/${encodeURIComponent(id)}`)
          }
        />
      )}
    </div>
  );
}

function ViewToggle({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <div className="mb-6 inline-flex rounded-xl bg-muted/70 p-1">
      {(
        [
          { key: "buyer", label: "Buyer view", icon: ShoppingBag },
          { key: "seller", label: "Seller view", icon: Store },
        ] as const
      ).map((tab) => {
        const active = view === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => setView(tab.key)}
            className={cn(
              "focus-ring relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <AnimatePresence initial={false}>
              {active && (
                <motion.span
                  layoutId="txn-view"
                  className="absolute inset-0 rounded-lg bg-card shadow-soft ring-1 ring-border/70"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </AnimatePresence>
            <Icon className="relative h-3.5 w-3.5" />
            <span className="relative">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function FilterRow({
  tabs,
  value,
  onChange,
  layoutId,
  onRefresh,
  refreshing,
}: {
  tabs: Array<{ key: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
  layoutId: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <SegmentedControl
        tabs={tabs}
        value={value}
        onChange={onChange}
        layoutId={layoutId}
      />
      <Button onClick={onRefresh} variant="secondary" disabled={refreshing}>
        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        Refresh
      </Button>
    </div>
  );
}

// --------- Buyer list -----------------------------------------------------

function BuyerList({
  state,
  setState,
  onOpen,
}: {
  state: string;
  setState: (v: string) => void;
  onOpen: (id: string) => void;
}) {
  const filters = useMemo(() => ({ order_state: state }), [state]);
  const fetcher = useCallback(
    (
      { cursor, limit }: { cursor: string | null; limit: number },
      { signal }: { signal: AbortSignal }
    ) =>
      listOrders({
        cursor: cursor ?? undefined,
        limit,
        order_state: state || undefined,
        signal,
      }),
    [state]
  );
  const pager = useCursorPager<OrderRow>({
    resource: "orders",
    filters,
    fetcher,
  });

  const columns = useMemo<ColDef<OrderRow>[]>(
    () => [
      {
        headerName: "Txn",
        field: "transaction_id",
        flex: 1,
        cellRenderer: (p: { data: OrderRow }) => (
          <IdCell value={p.data.transaction_id} max={22} />
        ),
      },
      {
        headerName: "Seller",
        field: "seller_name",
        flex: 1.2,
        cellRenderer: (p: { data: OrderRow }) => (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs text-foreground">
              {p.data.seller_name ?? "—"}
            </p>
            {p.data.bpp_id && (
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                via {p.data.bpp_id}
              </p>
            )}
          </div>
        ),
      },
      {
        headerName: "Quantity",
        field: "quantity_kwh",
        width: 110,
        cellRenderer: (p: { data: OrderRow }) =>
          p.data.quantity_kwh != null ? (
            <span className="tabular-nums text-xs text-foreground">
              {p.data.quantity_kwh} kWh
            </span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          ),
      },
      moneyColumn({
        headerName: "Amount",
        field: "total_amount",
        width: 130,
        cellRenderer: (p: { data: OrderRow }) => (
          <MoneyCell rupees={p.data.total_amount} />
        ),
      }),
      {
        headerName: "State",
        field: "order_state",
        width: 140,
        cellRenderer: (p: { data: OrderRow }) =>
          p.data.order_state ? (
            <Badge asStatus={p.data.order_state}>{p.data.order_state}</Badge>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          ),
      },
      {
        headerName: "Created",
        field: "created_at",
        width: 200,
        cellRenderer: (p: { data: OrderRow }) => (
          <TimeCell value={p.data.created_at} />
        ),
      },
    ],
    []
  );

  const hasFilters = state !== "";

  return (
    <>
      <FilterRow
        tabs={buyerStateTabs}
        value={state}
        onChange={setState}
        layoutId="txn-buyer-state"
        onRefresh={() => pager.refetch()}
        refreshing={pager.isFetching}
      />
      <ListPageState
        status={
          pager.isError ? "error" : pager.isPending ? "pending" : "success"
        }
        rows={pager.rows}
        error={pager.error}
        onRetry={() => pager.refetch()}
        onClearFilters={hasFilters ? () => setState("") : undefined}
        hasFilters={hasFilters}
        resourceLabel="orders"
        columns={6}
      >
        <GridCard>
          <DataGrid<OrderRow>
            rows={pager.rows}
            columns={columns}
            serverPaged
            framed={false}
            fetching={pager.isFetching && !pager.isPending}
            rowKey="transaction_id"
            getRowClass={(row) => stateRowClass(row.order_state)}
            onRowClick={(row) => onOpen(row.transaction_id)}
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
    </>
  );
}

// --------- Seller list ----------------------------------------------------

function SellerList({
  state,
  setState,
  onOpen,
}: {
  state: string;
  setState: (v: string) => void;
  onOpen: (id: string) => void;
}) {
  const filters = useMemo(() => ({ state }), [state]);
  const fetcher = useCallback(
    (
      { cursor, limit }: { cursor: string | null; limit: number },
      { signal }: { signal: AbortSignal }
    ) =>
      listTrades({
        cursor: cursor ?? undefined,
        limit,
        state: state || undefined,
        signal,
      }),
    [state]
  );
  const pager = useCursorPager<TradeRow>({
    resource: "trades",
    filters,
    fetcher,
  });

  const columns = useMemo<ColDef<TradeRow>[]>(
    () => [
      {
        headerName: "Txn",
        field: "transaction_id",
        flex: 1,
        cellRenderer: (p: { data: TradeRow }) => (
          <IdCell value={p.data.transaction_id} max={22} />
        ),
      },
      {
        headerName: "Buyer",
        field: "buyer_phone",
        width: 170,
        cellRenderer: (p: { data: TradeRow }) =>
          p.data.buyer_phone ? (
            <span className="font-mono text-xs text-foreground/90">
              {p.data.buyer_phone}
            </span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          ),
      },
      {
        headerName: "Offer",
        field: "seller_name",
        flex: 1.2,
        cellRenderer: (p: { data: TradeRow }) => (
          <span className="truncate text-xs text-foreground">
            {p.data.seller_name ?? "—"}
          </span>
        ),
      },
      moneyColumn({
        headerName: "Amount",
        field: "total_amount",
        width: 130,
        cellRenderer: (p: { data: TradeRow }) => (
          <MoneyCell rupees={p.data.total_amount ?? p.data.price} />
        ),
      }),
      {
        headerName: "State",
        field: "state",
        width: 140,
        cellRenderer: (p: { data: TradeRow }) => (
          <StatusPill status={p.data.state} />
        ),
      },
      {
        headerName: "Created",
        field: "created_at",
        width: 200,
        cellRenderer: (p: { data: TradeRow }) => (
          <TimeCell value={p.data.created_at} />
        ),
      },
    ],
    []
  );

  const hasFilters = state !== "";

  return (
    <>
      <FilterRow
        tabs={sellerStateTabs}
        value={state}
        onChange={setState}
        layoutId="txn-seller-state"
        onRefresh={() => pager.refetch()}
        refreshing={pager.isFetching}
      />
      <ListPageState
        status={
          pager.isError ? "error" : pager.isPending ? "pending" : "success"
        }
        rows={pager.rows}
        error={pager.error}
        onRetry={() => pager.refetch()}
        onClearFilters={hasFilters ? () => setState("") : undefined}
        hasFilters={hasFilters}
        resourceLabel="trades"
        columns={6}
      >
        <GridCard>
          <DataGrid<TradeRow>
            rows={pager.rows}
            columns={columns}
            serverPaged
            framed={false}
            fetching={pager.isFetching && !pager.isPending}
            rowKey="transaction_id"
            getRowClass={(row) => stateRowClass(row.state)}
            onRowClick={(row) => onOpen(row.transaction_id)}
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
    </>
  );
}
