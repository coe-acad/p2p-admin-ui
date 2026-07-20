import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import type { ColDef } from "ag-grid-community";

import { Button } from "@/components/ui/Button";
import { DataGrid } from "@/components/ui/DataGrid";
import { GridCard } from "@/components/ui/GridCard";
import { IdCell, MoneyCell, TimeCell } from "@/components/ui/cells";
import { ListPageState } from "@/components/ui/ListPageState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager } from "@/components/ui/Pager";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import { StatusPill } from "@/components/ui/StatusPill";
import { useCursorPager } from "@/hooks/useCursorPager";
import { useDrawerParam } from "@/hooks/useDrawerParam";
import { moneyColumn } from "@/lib/columns";
import { fmtPaise } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getPayment, listPayments, type PaymentRow } from "@/services/adminApi";

// Persistent row accent so failed/pending payments scan down the column.
const paymentRowClass = (row: PaymentRow): string | undefined => {
  const s = (row.status ?? "").toUpperCase();
  if (s === "FAILED") return "atria-row-danger";
  if (s === "PENDING") return "atria-row-warning";
  return undefined;
};

const statusTabs: Array<{ key: string; label: string }> = [
  { key: "", label: "All" },
  { key: "PAID", label: "Received" },
  { key: "CONFIRMED_TO_BAP", label: "Confirmed" },
  { key: "PENDING", label: "Pending" },
  { key: "FAILED", label: "Failed" },
  { key: "REFUNDED", label: "Refunded" },
];

export function PaymentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("");

  const filters = useMemo(() => ({ status }), [status]);

  const fetcher = useCallback(
    (
      { cursor, limit }: { cursor: string | null; limit: number },
      { signal }: { signal: AbortSignal }
    ) =>
      listPayments({
        cursor: cursor ?? undefined,
        limit,
        status: status || undefined,
        signal,
      }),
    [status]
  );

  const pager = useCursorPager<PaymentRow>({
    resource: "payments",
    filters,
    fetcher,
  });

  const drawer = useDrawerParam();
  const selected = useMemo(
    () =>
      drawer.id ? pager.rows.find((r) => r.order_id === drawer.id) : null,
    [drawer.id, pager.rows]
  );

  // Prefetch the full payment detail on row hover so the drawer + full route
  // both open instantly. Cached for 30s via useQueryClient defaults.
  const prefetchDetail = useCallback(
    (row: PaymentRow) => {
      queryClient.prefetchQuery({
        queryKey: ["payment", "detail", row.order_id],
        queryFn: ({ signal }) => getPayment(row.order_id, { signal }),
      });
    },
    [queryClient]
  );

  const columns = useMemo<ColDef<PaymentRow>[]>(
    () => [
      {
        headerName: "Order",
        field: "order_id",
        flex: 1,
        cellRenderer: (p: { data: PaymentRow }) => (
          <IdCell value={p.data.order_id} max={22} />
        ),
      },
      {
        headerName: "Buyer",
        field: "buyer_phone",
        width: 170,
        cellRenderer: (p: { data: PaymentRow }) =>
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
        cellRenderer: (p: { data: PaymentRow }) => (
          <MoneyCell paise={p.data.amount_paise} currency={p.data.currency} />
        ),
      }),
      {
        headerName: "Status",
        field: "status",
        width: 160,
        cellRenderer: (p: { data: PaymentRow }) => (
          <StatusPill status={p.data.status} />
        ),
      },
      {
        headerName: "Source",
        field: "paid_source",
        width: 130,
        cellRenderer: (p: { data: PaymentRow }) =>
          p.data.paid_source ? (
            <span className="text-xs text-muted-foreground">
              {p.data.paid_source}
            </span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          ),
      },
      {
        headerName: "Paid",
        field: "paid_at",
        width: 200,
        cellRenderer: (p: { data: PaymentRow }) => (
          <TimeCell value={p.data.paid_at} />
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
        title="Payments"
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
          layoutId="payments-status"
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
        resourceLabel="payments"
        columns={6}
      >
        <GridCard>
          <DataGrid<PaymentRow>
            rows={pager.rows}
            columns={columns}
            serverPaged
            framed={false}
            fetching={pager.isFetching && !pager.isPending}
            rowKey="order_id"
            getRowClass={paymentRowClass}
            onRowClick={(row) => drawer.open(row.order_id)}
            onRowHover={prefetchDetail}
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

      <Sheet open={drawer.isOpen} onOpenChange={drawer.setOpen}>
        <SheetContent width="560px">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <StatusPill status={selected.status} />
                  {selected.paid_source && (
                    <span className="text-xs text-muted-foreground">
                      via {selected.paid_source}
                    </span>
                  )}
                </div>
                <SheetTitle>
                  <MoneyCell
                    paise={selected.amount_paise}
                    currency={selected.currency}
                    className="text-lg"
                  />
                </SheetTitle>
              </SheetHeader>
              <SheetBody>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <MetaRow
                    label="Order id"
                    value={<IdCell value={selected.order_id} max={26} />}
                    span
                  />
                  <MetaRow
                    label="Buyer"
                    value={
                      <span className="font-mono">
                        {selected.buyer_phone ?? "—"}
                      </span>
                    }
                  />
                  <MetaRow
                    label="Gateway payment id"
                    value={<IdCell value={selected.razorpay_payment_id} max={20} />}
                  />
                  <MetaRow
                    label="Paid at"
                    value={<TimeCell value={selected.paid_at} />}
                  />
                  <MetaRow
                    label="Order confirmed"
                    value={<TimeCell value={selected.bap_confirmed_at} />}
                  />
                  {selected.bap_confirm_error && (
                    <MetaRow
                      label="Confirm error"
                      value={
                        <span className="text-destructive">
                          {selected.bap_confirm_error}
                        </span>
                      }
                      span
                    />
                  )}
                </dl>
                <div className="mt-6 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={() =>
                      navigate(
                        `/payments/${encodeURIComponent(selected.order_id)}`
                      )
                    }
                  >
                    Open payment
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MetaRow({
  label,
  value,
  span,
}: {
  label: string;
  value: React.ReactNode;
  span?: boolean;
}) {
  return (
    <div className={span ? "col-span-2" : undefined}>
      <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs text-foreground">{value}</dd>
    </div>
  );
}
