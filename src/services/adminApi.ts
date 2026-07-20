import { bap, bpp, payments, request } from "@/services/apiClient";

// ---------------------------------------------------------------------------
// Paged shape returned by every admin list endpoint after the cursor rollout.
// `count` is kept as a soft alias of `page_count` for one release cycle so
// this client works against either the old or new backend during transition.
// ---------------------------------------------------------------------------

export interface Paged<T> {
  items: T[];
  page_count: number;
  next_cursor: string | null;
  has_next: boolean;
  /** @deprecated Old handlers returned this as len(items). Prefer `page_count`. */
  count?: number;
}

export interface ListParams {
  limit?: number;
  cursor?: string | null;
  signal?: AbortSignal;
}

const asPaged = <T>(raw: unknown): Paged<T> => {
  const r = (raw ?? {}) as Partial<Paged<T>> & { items?: T[]; count?: number };
  const items = Array.isArray(r.items) ? r.items : [];
  const page_count =
    typeof r.page_count === "number"
      ? r.page_count
      : typeof r.count === "number"
        ? r.count
        : items.length;
  return {
    items,
    page_count,
    next_cursor: r.next_cursor ?? null,
    has_next: Boolean(r.has_next),
    count: r.count,
  };
};

// -------- Users (BPP) ----------------------------------------------------

export interface UserRow {
  phone_number: string;
  name: string | null;
  intent: "buy" | "sell" | null;
  is_vc_verified: boolean;
  vc_types: string[];
  created_at: string | null;
  updated_at: string | null;
}

export const listUsers = async (
  params: {
    intent?: string;
    vc_verified?: boolean;
  } & ListParams = {}
): Promise<Paged<UserRow>> => {
  const { signal, ...rest } = params;
  const raw = await request<unknown>(bpp, {
    url: "/api/admin/users",
    method: "GET",
    params: rest,
    signal,
  });
  return asPaged<UserRow>(raw);
};

export const getUser = (phone: string, opts: { signal?: AbortSignal } = {}) =>
  request<Record<string, unknown>>(bpp, {
    url: `/api/admin/users/${encodeURIComponent(phone)}`,
    method: "GET",
    signal: opts.signal,
  });

export interface ActivityEvent {
  type: string;
  created_at: string | null;
  [key: string]: unknown;
}

export const getUserActivity = (
  phone: string,
  opts: { signal?: AbortSignal } = {}
) =>
  request<{
    phone_number: string;
    counts: Record<string, number>;
    events: ActivityEvent[];
  }>(bpp, {
    url: `/api/admin/users/${encodeURIComponent(phone)}/activity`,
    method: "GET",
    signal: opts.signal,
  });

// -------- Trades (BPP) ---------------------------------------------------

export interface TradeRow {
  transaction_id: string;
  state: string | null;
  buyer_phone: string | null;
  owner_mobile: string | null;
  seller_name: string | null;
  bpp_id: string | null;
  total_amount: number | null;
  price: number | null;
  catalog_id: string | null;
  offer_ids: string[];
  created_at: string | null;
  updated_at: string | null;
  confirmed_at: string | null;
  admin_refund: Record<string, unknown> | null;
}

export const listTrades = async (
  params: {
    state?: string;
    buyer_phone?: string;
    owner_mobile?: string;
  } & ListParams = {}
): Promise<Paged<TradeRow>> => {
  const { signal, ...rest } = params;
  const raw = await request<unknown>(bpp, {
    url: "/api/admin/trades",
    method: "GET",
    params: rest,
    signal,
  });
  return asPaged<TradeRow>(raw);
};

export interface TradeDetail extends TradeRow {
  stages: Record<string, unknown>;
  claimed_offers: Record<string, number>;
  committed_offers: Record<string, number>;
  failure_reason: string | null;
  failure_offer_id: string | null;
  failed_at: string | null;
}

export const getTrade = (
  transactionId: string,
  opts: { signal?: AbortSignal } = {}
) =>
  request<TradeDetail>(bpp, {
    url: `/api/admin/trades/${encodeURIComponent(transactionId)}`,
    method: "GET",
    signal: opts.signal,
  });

// -------- Catalogs (BPP) -------------------------------------------------

export interface CatalogRow {
  catalog_id: string;
  owner_mobile: string | null;
  seller_name: string | null;
  bpp_id: string | null;
  is_active: boolean;
  offer_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export const listCatalogs = async (
  params: {
    owner_mobile?: string;
    is_active?: boolean;
  } & ListParams = {}
): Promise<Paged<CatalogRow>> => {
  const { signal, ...rest } = params;
  const raw = await request<unknown>(bpp, {
    url: "/api/admin/catalogs",
    method: "GET",
    params: rest,
    signal,
  });
  return asPaged<CatalogRow>(raw);
};

export interface Offer {
  offer_id: string;
  item_id: string | null;
  seller_name: string | null;
  owner_mobile: string | null;
  provider_id: string | null;
  bpp_id: string | null;
  catalog_id: string | null;
  // Pricing
  price_per_unit: number | null;
  currency: string | null;
  pricing_model: string | null;
  // Energy
  quantity_kwh: number | null;
  sold_kwh: number | null;
  unit: string | null;
  source_type: string | null;
  // Time windows
  delivery_start: string | null;
  delivery_end: string | null;
  validity_start: string | null;
  validity_end: string | null;
  // Metadata
  meter_id: string | null;
  location: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CatalogDetail extends CatalogRow {
  offers: Offer[];
  offer_count: number;
}

export const getCatalog = (
  catalogId: string,
  opts: { signal?: AbortSignal } = {}
) =>
  request<CatalogDetail>(bpp, {
    url: `/api/admin/catalogs/${encodeURIComponent(catalogId)}`,
    method: "GET",
    signal: opts.signal,
  });

// -------- Orders (BAP) ---------------------------------------------------

export interface OrderRow {
  transaction_id: string;
  buyer_phone: string | null;
  order_state: string | null;
  bpp_id: string | null;
  bpp_uri: string | null;
  bap_id: string | null;
  total_amount: number | null;
  quantity_kwh: number | null;
  seller_name: string | null;
  seller_id: string | null;
  created_at: string | null;
  received_at: string | null;
  initiated_at: string | null;
  confirmed_at: string | null;
}

export const listOrders = async (
  params: {
    buyer_phone?: string;
    order_state?: string;
  } & ListParams = {}
): Promise<Paged<OrderRow>> => {
  const { signal, ...rest } = params;
  const raw = await request<unknown>(bap, {
    url: "/api/admin/orders",
    method: "GET",
    params: rest,
    signal,
  });
  return asPaged<OrderRow>(raw);
};

export const getOrder = (
  transactionId: string,
  opts: { signal?: AbortSignal } = {}
) =>
  request<OrderRow & { context: unknown; order: unknown }>(bap, {
    url: `/api/admin/orders/${encodeURIComponent(transactionId)}`,
    method: "GET",
    signal: opts.signal,
  });

// -------- Payments (atria-payments) --------------------------------------

export interface PaymentRow {
  order_id: string;
  txn_id: string | null;
  buyer_uid: string | null;
  buyer_phone: string | null;
  amount_paise: number | null;
  currency: string | null;
  status: string | null;
  razorpay_payment_id: string | null;
  paid_source: string | null;
  paid_at: string | null;
  bap_confirmed_at: string | null;
  bap_confirm_error: string | null;
  refund_summary: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export const listPayments = async (
  params: {
    status?: string;
    buyer_phone?: string;
    txn_id?: string;
  } & ListParams = {}
): Promise<Paged<PaymentRow>> => {
  const { signal, ...rest } = params;
  const raw = await request<unknown>(payments, {
    url: "/api/admin/payments",
    method: "GET",
    params: rest,
    signal,
  });
  return asPaged<PaymentRow>(raw);
};

export interface PaymentDetail extends PaymentRow {
  refunds: Array<{
    razorpay_refund_id: string;
    amount_paise: number;
    currency: string;
    status: string;
    reason: string;
    admin_phone: string | null;
    created_at: string | null;
    processed_at: string | null;
  }>;
}

export const getPayment = (
  orderId: string,
  opts: { signal?: AbortSignal } = {}
) =>
  request<PaymentDetail>(payments, {
    url: `/api/admin/payments/${encodeURIComponent(orderId)}`,
    method: "GET",
    signal: opts.signal,
  });

// -------- Refunds (atria-payments) ---------------------------------------

export interface RefundRow {
  razorpay_refund_id: string;
  razorpay_order_id: string | null;
  txn_id: string | null;
  buyer_phone: string | null;
  amount_paise: number | null;
  currency: string | null;
  status: string | null;
  reason: string | null;
  admin_phone: string | null;
  admin_uid: string | null;
  request_id: string | null;
  created_at: string | null;
  processed_at: string | null;
  failed_at: string | null;
  updated_at: string | null;
}

export const listRefunds = async (
  params: {
    status?: string;
    buyer_phone?: string;
    admin_uid?: string;
  } & ListParams = {}
): Promise<Paged<RefundRow>> => {
  const { signal, ...rest } = params;
  const raw = await request<unknown>(payments, {
    url: "/api/admin/refunds",
    method: "GET",
    params: rest,
    signal,
  });
  return asPaged<RefundRow>(raw);
};

export const createRefund = async (
  body: { order_id: string; reason: string },
  requestId: string
) => {
  const response = await payments.post<{
    replayed: boolean;
    refund: RefundRow;
  }>("/api/admin/refunds", body, {
    headers: { "X-Request-Id": requestId },
  });
  return response.data;
};

// -------- Settlements (atria-payments) -----------------------------------

export interface SettlementLeg {
  amount_paise: number | null;
  status: string | null;
  attempt?: number | null;
  reference_id?: string | null;
  razorpayx_payout_id?: string | null;
  razorpay_refund_id?: string | null;
  failure_reason?: string | null;
  last_error?: string | null;
  skipped_reason?: string | null;
  mode?: string | null;
}

export interface SettlementRow {
  txn_id: string;
  seller_phone: string | null;
  buyer_phone: string | null;
  outcome: string | null;
  status: string | null;
  triggered_by: string | null;
  ordered_kwh: number | null;
  allocated_kwh: number | null;
  ratio: number | null;
  buyer_paid_paise: number | null;
  buyer_fee_paise: number | null;
  seller_fee_taken_paise: number | null;
  platform_earn_paise: number | null;
  notes: string[] | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  payout_leg: SettlementLeg | null;
  refund_leg: SettlementLeg | null;
  resolved_by?: string | null;
  resolution_reason?: string | null;
  created_at: string | null;
  updated_at: string | null;
  settled_at: string | null;
}

export const listSettlements = async (
  params: {
    status?: string;
    seller_phone?: string;
  } & ListParams = {}
): Promise<Paged<SettlementRow>> => {
  const { signal, ...rest } = params;
  const raw = await request<unknown>(payments, {
    url: "/api/admin/settlements",
    method: "GET",
    params: rest,
    signal,
  });
  return asPaged<SettlementRow>(raw);
};

// getSettlement re-fetches with a live RazorpayX/Razorpay status refresh
// server-side (V1 has no payout webhooks), so calling it is how the console
// pulls fresh leg status.
export const getSettlement = async (
  txnId: string,
  opts: { signal?: AbortSignal } = {}
): Promise<SettlementRow> => {
  const raw = await request<{ settlement: SettlementRow }>(payments, {
    url: `/api/admin/settlements/${encodeURIComponent(txnId)}`,
    method: "GET",
    signal: opts.signal,
  });
  return raw.settlement;
};

export interface TriggerSettlementBody {
  txn_id: string;
  seller_phone: string;
  outcome: "COMPLETED" | "FAILED" | "EXPIRED" | "REVOKED";
  ordered_kwh: number;
  allocated_kwh: number;
}

// TEMP manual trigger — mirrors the future trade-completion process. Removed
// once that process calls /api/settlements/reconcile directly.
export const triggerSettlement = async (
  body: TriggerSettlementBody,
  requestId: string
) => {
  const response = await payments.post<{ settlement: SettlementRow }>(
    "/api/admin/settlements/trigger",
    body,
    { headers: { "X-Request-Id": requestId } }
  );
  return response.data.settlement;
};

export const retrySettlementLeg = async (
  txnId: string,
  leg: "payout_leg" | "refund_leg",
  requestId: string
) => {
  const response = await payments.post<{ settlement: SettlementRow }>(
    `/api/admin/settlements/${encodeURIComponent(txnId)}/retry`,
    { leg },
    { headers: { "X-Request-Id": requestId } }
  );
  return response.data.settlement;
};

export const resolveSettlement = async (
  txnId: string,
  reason: string,
  requestId: string
) => {
  const response = await payments.post<{ settlement: SettlementRow }>(
    `/api/admin/settlements/${encodeURIComponent(txnId)}/resolve`,
    { reason },
    { headers: { "X-Request-Id": requestId } }
  );
  return response.data.settlement;
};

export const disableSellerPayout = async (
  sellerPhone: string,
  reason: string,
  requestId: string
) => {
  const response = await payments.post<{ account: Record<string, unknown> }>(
    `/api/admin/sellers/${encodeURIComponent(sellerPhone)}/disable-payout`,
    { reason },
    { headers: { "X-Request-Id": requestId } }
  );
  return response.data.account;
};

// -------- Ledger (BPP → DEG energy ledger) -------------------------------

export interface LedgerTradeDetail {
  tradeQty: number | null;
  tradeType: string | null;
  tradeUnit: string | null;
}

export interface LedgerRow {
  recordId: string;
  transactionId: string | null;
  role: string | null;
  orderItemId: string | null;
  intervalId: string | null;
  platformIdBuyer: string | null;
  platformIdSeller: string | null;
  discomIdBuyer: string | null;
  discomIdSeller: string | null;
  buyerId: string | null;
  sellerId: string | null;
  tradeTime: string | null;
  deliveryStartTime: string | null;
  deliveryEndTime: string | null;
  tradeDetails: LedgerTradeDetail[] | null;
  creationTime: string | null;
  rowDigest: string | null;
  // Enriched by the BPP endpoint (not on the raw ledger record):
  delivery_status: string | null; // DELIVERED | SCHEDULED | UNKNOWN
  settlement_status: string | null; // settlement doc status, or NOT_SETTLED
}

export const listLedger = async (
  params: {
    transaction_id?: string;
    role?: string;
  } & ListParams = {}
): Promise<Paged<LedgerRow>> => {
  const { signal, ...rest } = params;
  const raw = await request<unknown>(bpp, {
    url: "/api/admin/ledger",
    method: "GET",
    params: rest,
    signal,
  });
  return asPaged<LedgerRow>(raw);
};

// -------- Audit log (atria-payments) -------------------------------------

export interface AuditRow {
  action_id: string;
  admin_uid: string;
  admin_phone: string | null;
  action: string;
  target_type: string;
  target_id: string;
  request_id: string;
  reason: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string | null;
}

export const listAudit = async (
  params: {
    admin_uid?: string;
    action?: string;
    target_type?: string;
  } & ListParams = {}
): Promise<Paged<AuditRow>> => {
  const { signal, ...rest } = params;
  const raw = await request<unknown>(payments, {
    url: "/api/admin/audit",
    method: "GET",
    params: rest,
    signal,
  });
  return asPaged<AuditRow>(raw);
};
