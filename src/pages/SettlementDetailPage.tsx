import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RefreshCw, ShieldAlert, RotateCcw, CheckCircle2 } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { BackLink } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CopyChip } from "@/components/ui/CopyChip";
import { DescriptionList, Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { fmtDate, fmtPaise, statusLabel } from "@/lib/format";
import {
  disableSellerPayout,
  getSettlement,
  resolveSettlement,
  retrySettlementLeg,
  type SettlementLeg,
  type SettlementRow,
} from "@/services/adminApi";
import { toApiError } from "@/services/apiClient";

// Leg states an operator can retry — the failed terminal ones.
const RETRYABLE_LEG = new Set(["REJECTED", "REVERSED", "FAILED"]);
// Overall states an operator can close out with a reason.
const RESOLVABLE = new Set(["NEEDS_REVIEW", "PARTIAL_STUCK"]);

const generateUuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

type ActionKind = "resolve" | "disable" | null;

export function SettlementDetailPage() {
  const { txnId = "" } = useParams<{ txnId: string }>();
  const [settlement, setSettlement] = useState<SettlementRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Per-leg retry in flight, keyed by leg name.
  const [retrying, setRetrying] = useState<string | null>(null);

  // Shared modal for the two reason-gated actions (resolve / disable payout).
  const [action, setAction] = useState<ActionKind>(null);
  const [reason, setReason] = useState("");
  const [requestId, setRequestId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const fetchSettlement = async () => {
    setLoading(true);
    setError(null);
    try {
      // getSettlement triggers a server-side live refresh of in-flight legs.
      const data = await getSettlement(txnId);
      setSettlement(data);
    } catch (err) {
      setError(toApiError(err, "Failed to load settlement").message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txnId]);

  const handleRetry = async (leg: "payout_leg" | "refund_leg") => {
    setRetrying(leg);
    setNotice(null);
    try {
      const updated = await retrySettlementLeg(txnId, leg, generateUuid());
      setSettlement(updated);
      setNotice(`Retried ${leg === "payout_leg" ? "payout" : "refund"}.`);
    } catch (err) {
      setError(toApiError(err, "Retry failed").message);
    } finally {
      setRetrying(null);
    }
  };

  const openAction = (kind: Exclude<ActionKind, null>) => {
    setAction(kind);
    setReason("");
    setDialogError(null);
    setRequestId(generateUuid());
  };

  const closeAction = () => {
    if (submitting) return;
    setAction(null);
    setReason("");
    setDialogError(null);
  };

  const submitAction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setDialogError("A reason of at least 5 characters is required.");
      return;
    }
    if (!settlement) return;
    setSubmitting(true);
    setDialogError(null);
    try {
      if (action === "resolve") {
        const updated = await resolveSettlement(txnId, reason.trim(), requestId);
        setSettlement(updated);
        setNotice("Settlement marked resolved.");
      } else if (action === "disable") {
        if (!settlement.seller_phone) {
          setDialogError("This settlement has no seller phone to disable.");
          setSubmitting(false);
          return;
        }
        await disableSellerPayout(settlement.seller_phone, reason.trim(), requestId);
        setNotice(`Payout disabled for ${settlement.seller_phone}.`);
      }
      setAction(null);
    } catch (err) {
      setDialogError(toApiError(err, "Action failed").message);
    } finally {
      setSubmitting(false);
    }
  };

  const canResolve = settlement !== null && RESOLVABLE.has(settlement.status ?? "");

  return (
    <div>
      <BackLink to="/settlements">Back to settlements</BackLink>

      {loading && <DetailSkeleton />}

      {error && !loading && (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {settlement && !loading && (
        <div className="animate-fade-in">
          {/* Money hero — the buyer's captured amount, the source of the split */}
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-overline uppercase text-muted-foreground">
                Settlement · buyer paid
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span className="nums text-money font-semibold tracking-tight text-foreground">
                  <span className="text-2xl text-muted-foreground/60 align-top">₹</span>
                  {((settlement.buyer_paid_paise ?? 0) / 100).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <Badge asStatus={settlement.status}>
                  {statusLabel(settlement.status)}
                </Badge>
                {settlement.outcome && (
                  <Badge asStatus={settlement.outcome}>
                    {statusLabel(settlement.outcome)}
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <CopyChip value={settlement.txn_id} chip />
                <span>·</span>
                <span>Created {fmtDate(settlement.created_at)}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={fetchSettlement}>
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              {canResolve && (
                <Button variant="secondary" onClick={() => openAction("resolve")}>
                  <CheckCircle2 className="h-4 w-4" />
                  Resolve
                </Button>
              )}
            </div>
          </div>

          {notice && (
            <Alert tone="success" className="mb-6">
              {notice}
            </Alert>
          )}

          {/* NEEDS_REVIEW / notes surface the engine's reason for parking */}
          {settlement.notes && settlement.notes.length > 0 && (
            <Alert tone="warning" className="mb-6">
              {settlement.notes.join(" · ")}
            </Alert>
          )}

          <div className="space-y-6">
            {/* The split */}
            <Card
              title="Money split"
              description="How the buyer's payment is divided. Refund is derived by subtraction, so it always reconciles."
            >
              <DescriptionList cols={3}>
                <Field label="Delivery">
                  <span className="nums">
                    {settlement.allocated_kwh ?? "—"} / {settlement.ordered_kwh ?? "—"} kWh
                  </span>
                </Field>
                <Field label="Ratio">
                  <span className="nums">
                    {settlement.ratio != null
                      ? `${Math.round(settlement.ratio * 100)}%`
                      : "—"}
                  </span>
                </Field>
                <Field label="Buyer paid">
                  <span className="nums font-medium">
                    {fmtPaise(settlement.buyer_paid_paise)}
                  </span>
                </Field>
                <Field label="Seller payout">
                  <span className="nums font-medium text-foreground">
                    {fmtPaise(settlement.payout_leg?.amount_paise ?? 0)}
                  </span>
                </Field>
                <Field label="Buyer refund">
                  <span className="nums font-medium text-violet-600 dark:text-violet-400">
                    {fmtPaise(settlement.refund_leg?.amount_paise ?? 0)}
                  </span>
                </Field>
                <Field label="Platform earn">
                  <span className="nums font-medium">
                    {fmtPaise(settlement.platform_earn_paise)}
                  </span>
                </Field>
                <Field label="Seller fee taken">
                  <span className="nums">{fmtPaise(settlement.seller_fee_taken_paise)}</span>
                </Field>
                <Field label="Buyer fee">
                  <span className="nums">{fmtPaise(settlement.buyer_fee_paise)}</span>
                </Field>
              </DescriptionList>
            </Card>

            {/* Legs — each with its own retry */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <LegCard
                title="Payout leg"
                subtitle="To the seller"
                leg={settlement.payout_leg}
                idLabel="Payout id"
                idValue={settlement.payout_leg?.razorpayx_payout_id ?? null}
                retrying={retrying === "payout_leg"}
                onRetry={() => handleRetry("payout_leg")}
              />
              <LegCard
                title="Refund leg"
                subtitle="Back to the buyer"
                leg={settlement.refund_leg}
                idLabel="Refund id"
                idValue={settlement.refund_leg?.razorpay_refund_id ?? null}
                retrying={retrying === "refund_leg"}
                onRetry={() => handleRetry("refund_leg")}
              />
            </div>

            {/* Context */}
            <Card title="Details">
              <DescriptionList cols={3}>
                <Field label="Seller phone">
                  <span className="font-mono text-xs">
                    {settlement.seller_phone ?? "—"}
                  </span>
                </Field>
                <Field label="Buyer phone">
                  <span className="font-mono text-xs">
                    {settlement.buyer_phone ?? "—"}
                  </span>
                </Field>
                <Field label="Transaction id">
                  {settlement.txn_id ? (
                    <Link
                      to={`/transactions/seller/${settlement.txn_id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {settlement.txn_id}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Gateway order id">
                  <span className="font-mono text-xs">
                    {settlement.razorpay_order_id ?? "—"}
                  </span>
                </Field>
                <Field label="Gateway payment id">
                  <span className="font-mono text-xs">
                    {settlement.razorpay_payment_id ?? "—"}
                  </span>
                </Field>
                <Field label="Triggered by">
                  <span className="font-mono text-xs">
                    {settlement.triggered_by ?? "—"}
                  </span>
                </Field>
                <Field label="Settled">{fmtDate(settlement.settled_at)}</Field>
                <Field label="Updated">{fmtDate(settlement.updated_at)}</Field>
                {settlement.resolution_reason && (
                  <Field label="Resolution" span={3}>
                    <span className="text-[13px]">
                      {settlement.resolution_reason}
                      {settlement.resolved_by ? ` — ${settlement.resolved_by}` : ""}
                    </span>
                  </Field>
                )}
              </DescriptionList>
            </Card>

            {/* Danger zone — kill switch on the seller's payout account */}
            {settlement.seller_phone && (
              <Card
                title="Danger zone"
                description="Disable this seller's payout account. Existing settlements are unaffected; new payouts will park in review until a new account is added."
              >
                <Button variant="danger" onClick={() => openAction("disable")}>
                  <ShieldAlert className="h-4 w-4" />
                  Disable seller payout
                </Button>
              </Card>
            )}
          </div>
        </div>
      )}

      <Modal
        open={action !== null}
        onClose={closeAction}
        title={action === "resolve" ? "Resolve settlement" : "Disable seller payout"}
        description={
          action === "resolve"
            ? "Close this settlement out with a note. Does not move money."
            : settlement?.seller_phone
              ? `Stop new payouts to ${settlement.seller_phone}.`
              : "Disable seller payout"
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeAction} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant={action === "disable" ? "danger" : "primary"}
              loading={submitting}
              onClick={(event) => submitAction(event as unknown as React.FormEvent)}
            >
              {action === "resolve" ? "Mark resolved" : "Disable payout"}
            </Button>
          </>
        }
      >
        <form onSubmit={submitAction} className="space-y-4">
          <div>
            <label
              htmlFor="settlement-reason"
              className="block text-overline uppercase text-muted-foreground"
            >
              Reason (required)
            </label>
            <textarea
              id="settlement-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="What you verified / ticket # / why this is being actioned…"
              className="focus-ring mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors hover:border-input/80"
              required
            />
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            Request id <span className="font-mono">{requestId}</span> — replays with
            this id are no-ops.
          </p>
          {dialogError && <Alert tone="danger">{dialogError}</Alert>}
        </form>
      </Modal>
    </div>
  );
}

interface LegCardProps {
  title: string;
  subtitle: string;
  leg: SettlementLeg | null;
  idLabel: string;
  idValue: string | null;
  retrying: boolean;
  onRetry: () => void;
}

function LegCard({ title, subtitle, leg, idLabel, idValue, retrying, onRetry }: LegCardProps) {
  if (!leg) {
    return (
      <Card title={title} description={subtitle}>
        <p className="text-sm text-muted-foreground">
          No {title.toLowerCase()} for this settlement.
        </p>
      </Card>
    );
  }
  const canRetry = RETRYABLE_LEG.has(leg.status ?? "");
  const problem = leg.failure_reason ?? leg.last_error ?? null;

  return (
    <Card title={title} description={subtitle}>
      <div className="flex items-center justify-between gap-3">
        <span className="nums text-lg font-semibold text-foreground">
          {fmtPaise(leg.amount_paise)}
        </span>
        <Badge asStatus={leg.status}>{statusLabel(leg.status)}</Badge>
      </div>

      <DescriptionList cols={2} className="mt-4">
        <Field label={idLabel}>
          {idValue ? (
            <CopyChip value={idValue} chip />
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </Field>
        <Field label="Attempt">
          <span className="nums">{leg.attempt ?? 1}</span>
        </Field>
        {leg.reference_id && (
          <Field label="Reference" span={2}>
            <span className="font-mono text-xs">{leg.reference_id}</span>
          </Field>
        )}
        {leg.skipped_reason && (
          <Field label="Skipped" span={2}>
            <span className="text-[13px]">{leg.skipped_reason}</span>
          </Field>
        )}
      </DescriptionList>

      {problem && (
        <Alert tone="danger" className="mt-4">
          {problem}
        </Alert>
      )}

      {canRetry && (
        <div className="mt-4">
          <Button variant="secondary" onClick={onRetry} loading={retrying}>
            <RotateCcw className="h-3.5 w-3.5" />
            Retry {title.toLowerCase()}
          </Button>
        </div>
      )}
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-3 w-24" />
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
