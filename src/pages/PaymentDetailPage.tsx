import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CreditCard, Receipt } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { BackLink } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CopyChip } from "@/components/ui/CopyChip";
import { DescriptionList, Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { fmtDate, fmtPaise, statusLabel } from "@/lib/format";
import {
  createRefund,
  getPayment,
  type PaymentDetail,
} from "@/services/adminApi";
import { toApiError } from "@/services/apiClient";

const REFUNDABLE = new Set(["PAID", "CONFIRMED_TO_BAP"]);

const generateUuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export function PaymentDetailPage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [requestId, setRequestId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [refundedNotice, setRefundedNotice] = useState<string | null>(null);

  const fetchPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPayment(orderId);
      setPayment(data);
    } catch (err) {
      setError(toApiError(err, "Failed to load payment").message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const openDialog = () => {
    setReason("");
    setDialogError(null);
    setRequestId(generateUuid());
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialogOpen(false);
    setReason("");
    setDialogError(null);
  };

  const handleRefund = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) {
      setDialogError("Reason is required.");
      return;
    }
    setSubmitting(true);
    setDialogError(null);
    try {
      const result = await createRefund(
        { order_id: orderId, reason: reason.trim() },
        requestId
      );
      setDialogOpen(false);
      setRefundedNotice(
        result.replayed
          ? `Refund already existed (replay matched request id). Refund id: ${result.refund.razorpay_refund_id}`
          : `Refund initiated. Razorpay refund id: ${result.refund.razorpay_refund_id}`
      );
      await fetchPayment();
    } catch (err) {
      setDialogError(toApiError(err, "Refund failed").message);
    } finally {
      setSubmitting(false);
    }
  };

  const canRefund = payment !== null && REFUNDABLE.has(payment.status ?? "");

  const total = payment?.amount_paise ?? 0;
  const refundedSum =
    payment?.refunds.reduce((s, r) => s + (r.amount_paise ?? 0), 0) ?? 0;
  const remaining = Math.max(0, total - refundedSum);

  return (
    <div>
      <BackLink to="/payments">Back to payments</BackLink>

      {loading && <PaymentSkeleton />}

      {error && !loading && (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {payment && !loading && (
        <div className="animate-fade-in">
          {/* Money hero */}
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-overline uppercase text-muted-foreground">
                Payment
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span className="nums text-money font-semibold tracking-tight text-foreground">
                  <span className="text-2xl text-muted-foreground/60 align-top">
                    ₹
                  </span>
                  {(total / 100).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <Badge asStatus={payment.status}>
                  {statusLabel(payment.status)}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <CopyChip value={payment.order_id} chip />
                <span>·</span>
                <span>Paid {fmtDate(payment.paid_at)}</span>
              </div>
            </div>
            {canRefund && (
              <Button variant="danger" onClick={openDialog}>
                <Receipt className="h-4 w-4" />
                Refund
              </Button>
            )}
          </div>

          {refundedNotice && (
            <Alert tone="success" className="mb-6">
              {refundedNotice}
            </Alert>
          )}

          <div className="space-y-6">
            {/* Refund arithmetic — makes PARTIALLY_REFUNDED legible at a glance */}
            {refundedSum > 0 && total > 0 && (
              <Card title="Refund status">
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="bg-success/60"
                    style={{ width: `${(remaining / total) * 100}%` }}
                  />
                  <div
                    className="bg-destructive/60"
                    style={{ width: `${(refundedSum / total) * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[13px]">
                  <span className="text-muted-foreground">
                    Remaining{" "}
                    <span className="nums font-medium text-foreground">
                      {fmtPaise(remaining)}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Refunded{" "}
                    <span className="nums font-medium text-destructive">
                      {fmtPaise(refundedSum)}
                    </span>
                  </span>
                </div>
              </Card>
            )}

            <Card title="Payment details">
              <DescriptionList cols={3}>
                <Field label="Source">
                  {payment.paid_source ?? "—"}
                </Field>
                <Field label="Buyer phone">
                  <span className="font-mono text-xs">
                    {payment.buyer_phone ?? "—"}
                  </span>
                </Field>
                <Field label="Buyer uid">
                  <span className="font-mono text-xs">
                    {payment.buyer_uid ?? "—"}
                  </span>
                </Field>
                <Field label="Transaction id">
                  {payment.txn_id ? (
                    <Link
                      to={`/transactions/buyer/${payment.txn_id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {payment.txn_id}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Gateway payment id">
                  <span className="font-mono text-xs">
                    {payment.razorpay_payment_id ?? "—"}
                  </span>
                </Field>
                <Field label="Order confirmed">
                  {fmtDate(payment.bap_confirmed_at)}
                </Field>
              </DescriptionList>
              {payment.bap_confirm_error && (
                <Alert tone="warning" className="mt-5">
                  BAP confirm error: {payment.bap_confirm_error}
                </Alert>
              )}
            </Card>

            <Card title="Refund history" padded={false}>
              <Table
                rows={payment.refunds}
                emptyMessage="No refunds against this payment."
                emptyDescription="Refunds you issue from here will appear in this list."
                columns={[
                  {
                    header: "Refund id",
                    cell: (r) => (
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.razorpay_refund_id}
                      </span>
                    ),
                  },
                  {
                    header: "Amount",
                    cell: (r) => (
                      <span className="nums font-medium text-foreground">
                        {fmtPaise(r.amount_paise)}
                      </span>
                    ),
                    align: "right",
                  },
                  {
                    header: "Status",
                    cell: (r) => <Badge asStatus={r.status}>{r.status}</Badge>,
                  },
                  {
                    header: "Reason",
                    cell: (r) => <span className="text-[13px]">{r.reason}</span>,
                  },
                  { header: "By", cell: (r) => r.admin_phone ?? "—" },
                  {
                    header: "When",
                    cell: (r) => (
                      <span className="text-xs text-muted-foreground">
                        {fmtDate(r.created_at)}
                      </span>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        </div>
      )}

      <Modal
        open={dialogOpen}
        onClose={closeDialog}
        title="Refund payment"
        description={
          payment
            ? `Full refund of ${fmtPaise(payment.amount_paise)} to the buyer.`
            : "Refund payment"
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={submitting}
              onClick={(event) =>
                handleRefund(event as unknown as React.FormEvent)
              }
            >
              Confirm refund
            </Button>
          </>
        }
      >
        <Alert tone="danger" icon={CreditCard}>
          <p className="text-overline uppercase">Refund amount</p>
          <p className="nums mt-0.5 text-xl font-semibold">
            {payment ? fmtPaise(payment.amount_paise) : "—"}
          </p>
        </Alert>

        <form onSubmit={handleRefund} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="reason"
              className="block text-overline uppercase text-muted-foreground"
            >
              Reason (required)
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Discom did not allocate the energy / buyer complaint #1234 / …"
              className="focus-ring mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors hover:border-input/80"
              required
            />
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

function PaymentSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <Skeleton className="mb-4 h-4 w-24" />
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
