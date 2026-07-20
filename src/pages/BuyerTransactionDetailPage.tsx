import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, ReceiptText } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { DetailSkeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { fmtAmount, fmtDate, fmtPaise, statusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  getOrder,
  listPayments,
  type OrderRow,
  type PaymentRow,
} from "@/services/adminApi";
import { toApiError } from "@/services/apiClient";

interface OrderDetail extends OrderRow {
  context: unknown;
  order: unknown;
}

interface BuyerFacts {
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

const extractFacts = (orderBlock: unknown): BuyerFacts => {
  const order = asObj(orderBlock);
  const itemsRaw = order["beckn:orderItems"] ?? order["beckn:items"];
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

function Field({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-overline uppercase text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "min-w-0 truncate text-sm text-foreground",
          mono && "font-mono text-xs"
        )}
      >
        {children}
      </dd>
    </div>
  );
}

function Copyable({ text }: { text: string | null }) {
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
      className="focus-ring group inline-flex max-w-full items-center gap-1.5 truncate rounded-md text-left transition-colors hover:text-primary"
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

export function BuyerTransactionDetailPage() {
  const { txnId = "" } = useParams<{ txnId: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      getOrder(txnId),
      listPayments({ txn_id: txnId, limit: 1 }),
    ])
      .then(([orderResult, paymentResult]) => {
        if (cancelled) return;
        if (orderResult.status === "fulfilled")
          setOrder(orderResult.value as OrderDetail);
        else
          setError(
            toApiError(orderResult.reason, "Failed to load order").message
          );
        if (paymentResult.status === "fulfilled")
          setPayment(paymentResult.value.items[0] ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [txnId]);

  const facts = useMemo(() => extractFacts(order?.order), [order]);

  return (
    <div>
      <BackLink to="/transactions?view=buyer">Back to transactions</BackLink>

      <PageHeader
        eyebrow="Buyer transaction"
        title={order?.seller_name ?? "Transaction detail"}
      />

      {loading && <DetailSkeleton />}

      {error && !loading && (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {order && (
        <div className="space-y-5 animate-fade-in">
          {/* ---- Headline ---------------------------------------- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                State
              </p>
              <div className="mt-3">
                <Badge asStatus={order.order_state}>
                  {order.order_state ?? "—"}
                </Badge>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Total amount
              </p>
              <p className="mt-2 nums text-2xl font-semibold text-foreground">
                {fmtAmount(order.total_amount)}
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

          {/* ---- Energy delivery -------------------------------- */}
          <Card
            title="Energy delivery"
            description="The window in which the buyer receives energy."
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

          {/* ---- Buyer (us) + Seller (counterparty) ------------- */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card title="Buyer">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Phone" mono>
                  {order.buyer_phone ?? "—"}
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

            <Card
              title="Seller"
              description="The counterparty supplying the energy."
            >
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Name">{order.seller_name ?? "—"}</Field>
                <Field label="Network id">
                  <Copyable text={order.bpp_id} />
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
                <Field label="Provider id" mono>
                  {order.seller_id ?? "—"}
                </Field>
              </dl>
            </Card>
          </div>

          {/* ---- Payment ----------------------------------------- */}
          {payment ? (
            <Card
              title="Payment"
              description="The payment captured for this order."
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
                No payment recorded for this transaction yet.
              </p>
            </Card>
          )}

          {/* ---- Lifecycle --------------------------------------- */}
          <Card
            title="Lifecycle"
            description="When this order reached each stage."
          >
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Field label="Created">{fmtDate(order.created_at)}</Field>
              <Field label="Received">{fmtDate(order.received_at)}</Field>
              <Field label="Initiated">{fmtDate(order.initiated_at)}</Field>
              <Field label="Confirmed">{fmtDate(order.confirmed_at)}</Field>
            </dl>
          </Card>

          {/* ---- Network ids ------------------------------------ */}
          <Card title="Network identifiers">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Transaction id">
                <Copyable text={order.transaction_id} />
              </Field>
              <Field label="BPP id" mono>
                {order.bpp_id ?? "—"}
              </Field>
              <Field label="BPP uri" mono>
                {order.bpp_uri ?? "—"}
              </Field>
              <Field label="BAP id" mono>
                {order.bap_id ?? "—"}
              </Field>
            </dl>
          </Card>
        </div>
      )}
    </div>
  );
}
