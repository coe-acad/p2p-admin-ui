import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw } from "lucide-react";
import type { ColDef } from "ag-grid-community";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { DataGrid } from "@/components/ui/DataGrid";
import { GridCard } from "@/components/ui/GridCard";
import { IdCell, MoneyCell, TimeCell } from "@/components/ui/cells";
import { ListPageState } from "@/components/ui/ListPageState";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager } from "@/components/ui/Pager";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatusPill } from "@/components/ui/StatusPill";
import { useCursorPager } from "@/hooks/useCursorPager";
import { moneyColumn } from "@/lib/columns";
import { fmtPaise, statusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  listSettlements,
  triggerSettlement,
  type SettlementRow,
  type TriggerSettlementBody,
} from "@/services/adminApi";
import { toApiError } from "@/services/apiClient";

const statusTabs: Array<{ key: string; label: string }> = [
  { key: "", label: "All" },
  { key: "EXECUTING", label: "In progress" },
  { key: "NEEDS_REVIEW", label: "Needs review" },
  { key: "PARTIAL_STUCK", label: "Partly stuck" },
  { key: "COMPLETE", label: "Complete" },
  { key: "RESOLVED", label: "Resolved" },
];

const outcomeOptions: TriggerSettlementBody["outcome"][] = [
  "COMPLETED",
  "FAILED",
  "EXPIRED",
  "REVOKED",
];

const inputClass =
  "focus-ring mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors hover:border-input/80";

const settlementRowClass = (row: SettlementRow): string | undefined => {
  const s = (row.status ?? "").toUpperCase();
  if (s === "NEEDS_REVIEW" || s === "PARTIAL_STUCK") return "atria-row-danger";
  if (s === "EXECUTING") return "atria-row-warning";
  return undefined;
};

const generateUuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export function SettlementsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string>("");
  const [txnId, setTxnId] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [outcome, setOutcome] =
    useState<TriggerSettlementBody["outcome"]>("COMPLETED");
  const [orderedKwh, setOrderedKwh] = useState("");
  const [allocatedKwh, setAllocatedKwh] = useState("");

  const filters = useMemo(() => ({ status }), [status]);

  const fetcher = useCallback(
    (
      { cursor, limit }: { cursor: string | null; limit: number },
      { signal }: { signal: AbortSignal }
    ) =>
      listSettlements({
        cursor: cursor ?? undefined,
        limit,
        status: status || undefined,
        signal,
      }),
    [status]
  );

  const pager = useCursorPager<SettlementRow>({
    resource: "settlements",
    filters,
    fetcher,
  });

  const columns = useMemo<ColDef<SettlementRow>[]>(
    () => [
      {
        headerName: "Txn",
        field: "txn_id",
        flex: 1,
        cellRenderer: (p: { data: SettlementRow }) => (
          <IdCell value={p.data.txn_id} max={22} />
        ),
      },
      {
        headerName: "Seller",
        field: "seller_phone",
        width: 160,
        cellRenderer: (p: { data: SettlementRow }) =>
          p.data.seller_phone ? (
            <span className="font-mono text-xs text-foreground/90">
              {p.data.seller_phone}
            </span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          ),
      },
      {
        headerName: "Outcome",
        field: "outcome",
        width: 120,
        cellRenderer: (p: { data: SettlementRow }) => (
          <StatusPill status={p.data.outcome} />
        ),
      },
      moneyColumn({
        headerName: "Payout",
        width: 150,
        cellRenderer: (p: { data: SettlementRow }) => (
          <MoneyCell paise={p.data.payout_leg?.amount_paise ?? null} />
        ),
      }),
      {
        headerName: "Payout status",
        width: 140,
        cellRenderer: (p: { data: SettlementRow }) =>
          p.data.payout_leg ? (
            <StatusPill status={p.data.payout_leg.status} />
          ) : (
            <span className="text-muted-foreground/60">—</span>
          ),
      },
      moneyColumn({
        headerName: "Refund",
        width: 140,
        cellRenderer: (p: { data: SettlementRow }) => (
          <MoneyCell paise={p.data.refund_leg?.amount_paise ?? null} />
        ),
      }),
      {
        headerName: "Status",
        field: "status",
        width: 150,
        cellRenderer: (p: { data: SettlementRow }) => (
          <StatusPill status={p.data.status} />
        ),
      },
      {
        headerName: "Created",
        field: "created_at",
        width: 190,
        cellRenderer: (p: { data: SettlementRow }) => (
          <TimeCell value={p.data.created_at} />
        ),
      },
    ],
    []
  );

  const hasFilters = status !== "";

  const pagePayoutSum = useMemo(
    () =>
      pager.rows.reduce((sum, r) => sum + (r.payout_leg?.amount_paise ?? 0), 0),
    [pager.rows]
  );

  const openDialog = () => {
    setTxnId("");
    setSellerPhone("");
    setOutcome("COMPLETED");
    setOrderedKwh("");
    setAllocatedKwh("");
    setDialogError(null);
    setRequestId(generateUuid());
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialogOpen(false);
    setDialogError(null);
  };

  const handleTrigger = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const trimmedTxn = txnId.trim();
    const trimmedSeller = sellerPhone.trim();
    if (!trimmedTxn) {
      setDialogError("Txn id is required.");
      return;
    }
    if (!trimmedSeller) {
      setDialogError("Seller phone is required.");
      return;
    }
    const ordered = Number(orderedKwh);
    if (orderedKwh.trim() === "" || Number.isNaN(ordered) || ordered < 0) {
      setDialogError("Ordered kWh must be a number ≥ 0.");
      return;
    }
    const allocated = allocatedKwh.trim() === "" ? 0 : Number(allocatedKwh);
    if (Number.isNaN(allocated) || allocated < 0) {
      setDialogError("Allocated kWh must be a number ≥ 0.");
      return;
    }

    setSubmitting(true);
    setDialogError(null);
    try {
      const result = await triggerSettlement(
        {
          txn_id: trimmedTxn,
          seller_phone: trimmedSeller,
          outcome,
          ordered_kwh: ordered,
          allocated_kwh: allocated,
        },
        requestId
      );
      setDialogOpen(false);
      setNotice(
        `Settlement ${statusLabel(result.status).toLowerCase()} — payout ${statusLabel(
          result.payout_leg?.status ?? "none"
        ).toLowerCase()}, refund ${statusLabel(
          result.refund_leg?.status ?? "none"
        ).toLowerCase()}.`
      );
      pager.refetch();
    } catch (err) {
      setDialogError(toApiError(err, "Trigger failed").message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settlements"
        actions={
          <>
            <Button variant="primary" onClick={openDialog}>
              <Plus className="h-3.5 w-3.5" />
              New settlement
            </Button>
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
          </>
        }
      />

      <div className="mb-4">
        <SegmentedControl
          tabs={statusTabs}
          value={status}
          onChange={setStatus}
          layoutId="settlements-status"
        />
      </div>

      {notice && (
        <Alert tone="success" className="mb-4">
          {notice}
        </Alert>
      )}

      <ListPageState
        status={
          pager.isError ? "error" : pager.isPending ? "pending" : "success"
        }
        rows={pager.rows}
        error={pager.error}
        onRetry={() => pager.refetch()}
        onClearFilters={hasFilters ? () => setStatus("") : undefined}
        hasFilters={hasFilters}
        resourceLabel="settlements"
        columns={8}
      >
        <GridCard>
          <DataGrid<SettlementRow>
            rows={pager.rows}
            columns={columns}
            serverPaged
            framed={false}
            fetching={pager.isFetching && !pager.isPending}
            rowKey="txn_id"
            getRowClass={settlementRowClass}
            onRowClick={(row) => navigate(`/settlements/${row.txn_id}`)}
          />
          <Pager
            footer
            note={
              pager.rows.length > 0 ? (
                <>
                  ·{" "}
                  <span className="font-medium text-foreground">
                    {fmtPaise(pagePayoutSum)}
                  </span>{" "}
                  paid out on this page
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

      <Modal
        open={dialogOpen}
        onClose={closeDialog}
        title="Create a settlement manually"
        description="Settle a trade by hand — running its seller payout and buyer refund — for cases automated settlement hasn't covered yet."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeDialog}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              onClick={(event) =>
                handleTrigger(event as unknown as React.FormEvent)
              }
            >
              Create settlement
            </Button>
          </>
        }
      >
        <form onSubmit={handleTrigger} className="space-y-4">
          <div>
            <label
              htmlFor="settlement-txn"
              className="block text-overline uppercase text-muted-foreground"
            >
              Txn id
            </label>
            <input
              id="settlement-txn"
              type="text"
              value={txnId}
              onChange={(event) => setTxnId(event.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label
              htmlFor="settlement-seller"
              className="block text-overline uppercase text-muted-foreground"
            >
              Seller phone
            </label>
            <input
              id="settlement-seller"
              type="text"
              value={sellerPhone}
              onChange={(event) => setSellerPhone(event.target.value)}
              placeholder="+91…"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label
              htmlFor="settlement-outcome"
              className="block text-overline uppercase text-muted-foreground"
            >
              Outcome
            </label>
            <select
              id="settlement-outcome"
              value={outcome}
              onChange={(event) =>
                setOutcome(
                  event.target.value as TriggerSettlementBody["outcome"]
                )
              }
              className={inputClass}
            >
              {outcomeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="settlement-ordered"
              className="block text-overline uppercase text-muted-foreground"
            >
              Ordered kWh
            </label>
            <input
              id="settlement-ordered"
              type="number"
              min={0}
              step="any"
              value={orderedKwh}
              onChange={(event) => setOrderedKwh(event.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label
              htmlFor="settlement-allocated"
              className="block text-overline uppercase text-muted-foreground"
            >
              Allocated kWh
            </label>
            <input
              id="settlement-allocated"
              type="number"
              min={0}
              step="any"
              value={allocatedKwh}
              onChange={(event) => setAllocatedKwh(event.target.value)}
              className={inputClass}
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground/70">
              For FAILED / EXPIRED / REVOKED this is ignored — the buyer is
              refunded in full.
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground/70">
            Request id <span className="font-mono">{requestId}</span> — replays
            with this id are no-ops.
          </p>
          {dialogError && <Alert tone="danger">{dialogError}</Alert>}
        </form>
      </Modal>
    </div>
  );
}
