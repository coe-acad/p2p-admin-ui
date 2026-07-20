import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, ReceiptText, Zap } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { DetailSkeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { fmtAmount, fmtDate, fmtPaise, statusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  getTrade,
  listPayments,
  type PaymentRow,
  type TradeDetail,
} from "@/services/adminApi";
import { toApiError } from "@/services/apiClient";



// ------- Extract useful facts from the Beckn stages ------------------------
interface TradeFacts {
  quantity: number | null;
  unit: string;
  pricePerUnit: number | null;
  currency: string;
  deliveryStart: string | null;
  deliveryEnd: string | null;
  validityStart: string | null;
  validityEnd: string | null;
  pricingModel: string | null;
  paymentStatus: string | null;
  sellerMeterId: string | null;
  sellerUtility: string | null;
  sellerCustomerId: string | null;
  buyerMeterId: string | null;
  buyerUtility: string | null;
  buyerCustomerId: string | null;
}

const asObj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};

const asStr = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

const asNum = (v: unknown): number | null => (typeof v === "number" ? v : null);

const extractFacts = (stages: Record<string, unknown> | undefined): TradeFacts => {
  const stageObj =
    asObj(stages?.["on_confirm"]) ||
    asObj(stages?.["on_init"]) ||
    asObj(stages?.["on_select"]);
  const order = asObj(stageObj.order);
  const itemsRaw = order["beckn:orderItems"];
  const items = Array.isArray(itemsRaw) ? itemsRaw : [];
  const item = asObj(items[0]);
  const quantity = asObj(item["beckn:quantity"]);
  const offer = asObj(item["beckn:acceptedOffer"]);
  const price = asObj(offer["beckn:price"]);
  const offerAttrs = asObj(offer["beckn:offerAttributes"]);
  const itemAttrs = asObj(item["beckn:orderItemAttributes"]);
  const provider = asObj(itemAttrs.providerAttributes);
  const buyer = asObj(order["beckn:buyer"]);
  const buyerAttrs = asObj(buyer["beckn:buyerAttributes"]);
  const payment = asObj(order["beckn:payment"]);
  const deliveryWindow = asObj(offerAttrs.deliveryWindow);
  const validityWindow = asObj(offerAttrs.validityWindow);

  return {
    quantity: asNum(quantity.unitQuantity),
    unit: asStr(quantity.unitText) ?? "kWh",
    pricePerUnit:
      asNum(price["schema:price"]) ?? asNum(price.price) ?? null,
    currency:
      asStr(price.currency) ??
      asStr(price["schema:priceCurrency"]) ??
      "INR",
    deliveryStart:
      asStr(deliveryWindow["schema:startTime"]) ??
      asStr(deliveryWindow.startTime),
    deliveryEnd:
      asStr(deliveryWindow["schema:endTime"]) ??
      asStr(deliveryWindow.endTime),
    validityStart:
      asStr(validityWindow["schema:startTime"]) ??
      asStr(validityWindow.startTime),
    validityEnd:
      asStr(validityWindow["schema:endTime"]) ??
      asStr(validityWindow.endTime),
    pricingModel: asStr(offerAttrs.pricingModel),
    paymentStatus: asStr(payment["beckn:paymentStatus"]),
    sellerMeterId: asStr(provider.meterId),
    sellerUtility: asStr(provider.utilityId),
    sellerCustomerId: asStr(provider.utilityCustomerId),
    buyerMeterId: asStr(buyerAttrs.meterId),
    buyerUtility: asStr(buyerAttrs.utilityId),
    buyerCustomerId: asStr(buyerAttrs.utilityCustomerId),
  };
};

// ------- Tiny UI primitives ------------------------------------------------
interface FieldProps {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}
function Field({ label, children, mono = false }: FieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-overline uppercase text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 truncate text-sm text-foreground",
          mono && "font-mono text-xs"
        )}
        title={typeof children === "string" ? children : undefined}
      >
        {children}
      </dd>
    </div>
  );
}

interface CopyableProps {
  text: string | null;
  className?: string;
}
function Copyable({ text, className }: CopyableProps) {
  const [copied, setCopied] = useState(false);
  if (!text) return <span className="text-muted-foreground/70">—</span>;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        });
      }}
      className={cn(
        "focus-ring group inline-flex max-w-full items-center gap-1.5 truncate rounded-md text-left transition-colors hover:text-primary",
        className
      )}
      title={text}
    >
      <span className="truncate font-mono text-xs">{text}</span>
      <Copy
        className={cn(
          "h-3 w-3 shrink-0 transition-colors",
          copied ? "text-accent" : "text-muted-foreground/40 group-hover:text-primary"
        )}
      />
    </button>
  );
}

// ------- Main page ---------------------------------------------------------
export function SellerTransactionDetailPage() {
  const { txnId = "" } = useParams<{ txnId: string }>();
  const [trade, setTrade] = useState<TradeDetail | null>(null);
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([
      getTrade(txnId),
      listPayments({ txn_id: txnId, limit: 1 }),
    ])
      .then(([tradeResult, paymentResult]) => {
        if (cancelled) return;
        if (tradeResult.status === "fulfilled") setTrade(tradeResult.value);
        else
          setError(
            toApiError(tradeResult.reason, "Failed to load trade").message
          );
        if (paymentResult.status === "fulfilled") {
          setPayment(paymentResult.value.items[0] ?? null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [txnId]);

  const facts = useMemo(
    () => extractFacts(trade?.stages as Record<string, unknown> | undefined),
    [trade]
  );

  return (
    <div>
      <BackLink to="/transactions?view=seller">Back to transactions</BackLink>

      <PageHeader
        eyebrow="Seller transaction"
        title={trade ? trade.seller_name ?? "Trade detail" : "Trade detail"}
      />

      {loading && <DetailSkeleton />}

      {error && !loading && (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {trade && (
        <div className="space-y-5 animate-fade-in">
          {/* ---- Headline strip --------------------------------- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                State
              </p>
              <div className="mt-3">
                <Badge asStatus={trade.state}>{trade.state ?? "—"}</Badge>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Total amount
              </p>
              <p className="mt-2 nums text-2xl font-semibold text-foreground">
                {fmtAmount(trade.total_amount ?? trade.price ?? null)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Quantity
              </p>
              <p className="mt-2 nums text-2xl font-semibold text-foreground">
                {facts.quantity !== null
                  ? `${facts.quantity} ${facts.unit}`
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Price per {facts.unit}
              </p>
              <p className="mt-2 nums text-2xl font-semibold text-foreground">
                {facts.pricePerUnit !== null
                  ? fmtAmount(facts.pricePerUnit, facts.currency)
                  : "—"}
              </p>
            </div>
          </div>

          {/* ---- Energy delivery --------------------------------- */}
          <Card
            title="Energy delivery"
            description="The window in which the seller delivers energy."
          >
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Field label="Delivery start">{fmtDate(facts.deliveryStart)}</Field>
              <Field label="Delivery end">{fmtDate(facts.deliveryEnd)}</Field>
              <Field label="Validity start">{fmtDate(facts.validityStart)}</Field>
              <Field label="Validity end">{fmtDate(facts.validityEnd)}</Field>
              <Field label="Pricing model">{facts.pricingModel ?? "—"}</Field>
              <Field label="Currency">{facts.currency}</Field>
              <Field label="Payment status">
                {facts.paymentStatus ? (
                  <Badge variant="info">{facts.paymentStatus}</Badge>
                ) : (
                  "—"
                )}
              </Field>
            </dl>
          </Card>

          {/* ---- Parties ----------------------------------------- */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card title="Buyer">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Phone" mono>
                  {trade.buyer_phone ? (
                    <Link
                      to={`/users/${encodeURIComponent(trade.buyer_phone)}`}
                      className="text-primary hover:underline"
                    >
                      {trade.buyer_phone}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Discom (utility)">
                  {facts.buyerUtility ?? "—"}
                </Field>
                <Field label="Consumer id" mono>
                  {facts.buyerCustomerId ?? "—"}
                </Field>
                <Field label="Meter id" mono>
                  {facts.buyerMeterId ?? "—"}
                </Field>
              </dl>
            </Card>

            <Card title="Seller">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Name">
                  {trade.seller_name ?? "—"}
                </Field>
                <Field label="Phone" mono>
                  {trade.owner_mobile ? (
                    <Link
                      to={`/users/${encodeURIComponent(trade.owner_mobile)}`}
                      className="text-primary hover:underline"
                    >
                      {trade.owner_mobile}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Discom (utility)">
                  {facts.sellerUtility ?? "—"}
                </Field>
                <Field label="Consumer id" mono>
                  {facts.sellerCustomerId ?? "—"}
                </Field>
                <Field label="Meter id" mono>
                  {facts.sellerMeterId ?? "—"}
                </Field>
              </dl>
            </Card>
          </div>

          {/* ---- Payment ----------------------------------------- */}
          {payment ? (
            <Card
              title="Payment"
              description="The payment captured for this trade."
              actions={
                <Link
                  to={`/payments/${encodeURIComponent(payment.order_id)}`}
                  className="focus-ring inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <ReceiptText className="h-3 w-3" />
                  View payment
                </Link>
              }
            >
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <Field label="Status">
                  <Badge asStatus={payment.status}>
                    {statusLabel(payment.status)}
                  </Badge>
                </Field>
                <Field label="Amount">
                  <span className="nums font-semibold">
                    {fmtPaise(payment.amount_paise)}
                  </span>
                </Field>
                <Field label="Source">{payment.paid_source ?? "—"}</Field>
                <Field label="Paid at">{fmtDate(payment.paid_at)}</Field>
                <Field label="Gateway order id">
                  <Copyable text={payment.order_id} />
                </Field>
                <Field label="Gateway payment id">
                  <Copyable text={payment.razorpay_payment_id} />
                </Field>
                {payment.bap_confirm_error && (
                  <Field label="Confirm error">
                    <span className="text-xs text-destructive">
                      {payment.bap_confirm_error}
                    </span>
                  </Field>
                )}
              </dl>
            </Card>
          ) : (
            <Card title="Payment">
              <p className="text-sm text-muted-foreground">
                No payment recorded for this transaction. Either the buyer
                didn't reach the pay step, or the payment lives under a
                different transaction id.
              </p>
            </Card>
          )}

          {/* ---- Timeline ---------------------------------------- */}
          <Card title="Lifecycle" description="When this trade reached each stage.">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Field label="Created">{fmtDate(trade.created_at)}</Field>
              <Field label="Confirmed">{fmtDate(trade.confirmed_at)}</Field>
              <Field label="Last updated">{fmtDate(trade.updated_at)}</Field>
            </dl>
          </Card>

          {/* ---- Failure (only when state=FAILED) --------------- */}
          {trade.state === "FAILED" && (
            <Card
              title="Failure"
              description="Why this trade did not complete."
              className="border-destructive/30"
            >
              <Alert tone="danger" title={trade.failure_reason ?? "Unknown failure"}>
                {trade.failure_offer_id && (
                  <p className="font-mono text-xs">
                    Offer: {trade.failure_offer_id}
                  </p>
                )}
                {trade.failed_at && (
                  <p className="mt-1 text-xs">Failed at {fmtDate(trade.failed_at)}</p>
                )}
              </Alert>
            </Card>
          )}

          {/* ---- Refund (only when admin_refund exists) --------- */}
          {trade.admin_refund && (
            <RefundedCard refund={trade.admin_refund} />
          )}

          {/* ---- Network identifiers ---------------------------- */}
          <Card
            title="Network identifiers"
            description="Reference ids for cross-checking with the network."
          >
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Transaction id">
                <Copyable text={trade.transaction_id} />
              </Field>
              <Field label="BPP id" mono>
                {trade.bpp_id ?? "—"}
              </Field>
              <Field label="Catalog id">
                {trade.catalog_id ? (
                  <Link
                    to={`/catalogs/${encodeURIComponent(trade.catalog_id)}`}
                    className="truncate font-mono text-xs text-primary hover:underline"
                  >
                    {trade.catalog_id}
                  </Link>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Offer ids" mono>
                {trade.offer_ids.length > 0 ? trade.offer_ids.join(", ") : "—"}
              </Field>
            </dl>
          </Card>

          {/* ---- Inventory commit (debug aid) ------------------- */}
          {(Object.keys(trade.claimed_offers).length > 0 ||
            Object.keys(trade.committed_offers).length > 0) && (
            <Card
              title="Inventory commit"
              description="Energy claimed when the trade was selected, and committed when it was confirmed."
            >
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Claimed">
                  <ul className="space-y-1 font-mono text-xs">
                    {Object.entries(trade.claimed_offers).map(([id, kwh]) => (
                      <li key={id} className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-muted-foreground/60" />
                        <span className="truncate">{id}</span>
                        <span className="ml-auto nums font-semibold">
                          {kwh} {facts.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Field>
                <Field label="Committed">
                  <ul className="space-y-1 font-mono text-xs">
                    {Object.entries(trade.committed_offers).map(([id, kwh]) => (
                      <li key={id} className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-accent" />
                        <span className="truncate">{id}</span>
                        <span className="ml-auto nums font-semibold">
                          {kwh} {facts.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Field>
              </dl>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function RefundedCard({ refund }: { refund: Record<string, unknown> }) {
  const amount = asNum(refund.amount_paise) ?? asNum(refund.amount);
  const reason = asStr(refund.reason);
  const admin = asStr(refund.admin_phone) ?? asStr(refund.admin);
  const at =
    asStr(refund.created_at) ??
    asStr(refund.processed_at) ??
    asStr(refund.timestamp);
  return (
    <Card
      title="Refunded by admin"
      description="This trade was refunded from the admin console."
      className="border-destructive/30"
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Field label="Amount">
          <span className="nums font-semibold">
            {amount != null ? fmtPaise(amount) : "—"}
          </span>
        </Field>
        <Field label="Reason">{reason ?? "—"}</Field>
        <Field label="By" mono>
          {admin ?? "—"}
        </Field>
        <Field label="When">{fmtDate(at)}</Field>
      </dl>
      <details className="mt-4">
        <summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-1 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          View raw payload
        </summary>
        <pre className="thin-scroll mt-2 max-h-72 overflow-auto rounded-lg bg-muted/40 p-4 font-mono text-[11px] leading-relaxed text-foreground/90 ring-1 ring-inset ring-border">
          {JSON.stringify(refund, null, 2)}
        </pre>
      </details>
    </Card>
  );
}
