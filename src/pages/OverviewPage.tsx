import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Globe,
  Package,
  ShieldAlert,
  Store,
  Undo2,
  Users,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";

import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { TimeCell } from "@/components/ui/cells";
import { cn } from "@/lib/utils";
import {
  listAudit,
  listCatalogs,
  listLedger,
  listPayments,
  listRefunds,
  listSettlements,
  listTrades,
  listUsers,
  type LedgerRow,
} from "@/services/adminApi";
import { statusLabel } from "@/lib/format";

const upper = (s: string | null | undefined) => (s ?? "").toUpperCase();
const time = (iso: string | null | undefined) =>
  iso ? new Date(iso).getTime() : 0;

// Our aggregator runs a BAP + a BPP. A ledger trade is "within" when BOTH sides
// are ours; "cross-aggregator" when exactly one side is an external network
// participant (the Beckn interoperability signal). Old test ids are kept so
// pre-migration ledger records classify correctly.
const OUR_PLATFORM_IDS = new Set([
  "bap.charzpe.com",
  "bpp.charzpe.com",
  "p2p-atria-bap-test",
  "p2p-atria-bpp-test",
]);

// Payout-leg statuses that mean "money is on its way but not yet paid out".
const PAYOUT_IN_FLIGHT = new Set(["PENDING", "QUEUED", "PROCESSING", "INITIATED"]);

type Window = "7d" | "30d" | "all";
const WINDOW_DAYS: Record<Window, number | null> = { "7d": 7, "30d": 30, all: null };

const inWindow = (iso: string | null | undefined, days: number | null) => {
  if (days == null) return true; // "All"
  if (!iso) return false;
  return new Date(iso).getTime() >= Date.now() - days * 86_400_000;
};

// Daily buckets (oldest → newest) over `sparkDays`, plus this-window vs
// previous-window totals for a % delta. sparkDays = the active window, or 30 for
// "All" (where there is no previous window, so no delta).
function bucketize<T>(
  rows: T[],
  getDate: (r: T) => string | null | undefined,
  getVal: (r: T) => number,
  sparkDays: number,
  wantDelta: boolean
): { series: number[]; deltaPct: number | null } {
  const DAY = 86_400_000;
  const now = Date.now();
  const series = new Array(sparkDays).fill(0) as number[];
  let cur = 0;
  let prev = 0;
  for (const r of rows) {
    const iso = getDate(r);
    if (!iso) continue;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) continue;
    const age = Math.floor((now - t) / DAY);
    const val = getVal(r);
    if (age >= 0 && age < sparkDays) {
      series[sparkDays - 1 - age] += val;
      cur += val;
    } else if (wantDelta && age >= sparkDays && age < sparkDays * 2) {
      prev += val;
    }
  }
  const deltaPct = wantDelta && prev > 0 ? ((cur - prev) / prev) * 100 : null;
  return { series, deltaPct };
}

// ₹, 2-decimal (paise-accurate), currency mark one step muted.
const rupees = (paise: number) => (
  <span>
    <span className="text-muted-foreground/60">₹</span>
    {(paise / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
  </span>
);

const num = (n: number) => n.toLocaleString("en-IN");

const kwh = (n: number) => (
  <span>
    {n.toFixed(n < 100 ? 1 : 0)}
    <span className="ml-1 text-base font-medium text-muted-foreground/60">kWh</span>
  </span>
);

const todayLabel = () =>
  new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

interface QueueItem {
  key: string;
  kind: string;
  id: string;
  status: string | null;
  amount: number | null;
  at: string | null;
  to: string;
}

export function OverviewPage() {
  const navigate = useNavigate();
  const [window, setWindow] = useState<Window>("30d");
  const days = WINDOW_DAYS[window];
  const sparkDays = days ?? 30; // "All" still shows a recent-30d trend line
  const wantDelta = days != null;

  // Pull a generous page from each area. Accurate for pilot volumes; a backend
  // aggregation endpoint should replace this before the data outgrows 500 rows.
  const paymentsQ = useQuery({
    queryKey: ["overview", "payments"],
    queryFn: ({ signal }) => listPayments({ limit: 500, signal }),
  });
  const refundsQ = useQuery({
    queryKey: ["overview", "refunds"],
    queryFn: ({ signal }) => listRefunds({ limit: 500, signal }),
  });
  const settlementsQ = useQuery({
    queryKey: ["overview", "settlements"],
    queryFn: ({ signal }) => listSettlements({ limit: 500, signal }),
  });
  const ledgerQ = useQuery({
    queryKey: ["overview", "ledger"],
    queryFn: ({ signal }) => listLedger({ limit: 500, signal }),
  });
  const tradesQ = useQuery({
    queryKey: ["overview", "trades"],
    queryFn: ({ signal }) => listTrades({ limit: 500, signal }),
  });
  const catalogsQ = useQuery({
    queryKey: ["overview", "catalogs"],
    queryFn: ({ signal }) => listCatalogs({ limit: 500, signal }),
  });
  const usersQ = useQuery({
    queryKey: ["overview", "users"],
    queryFn: ({ signal }) => listUsers({ limit: 500, signal }),
  });
  const auditQ = useQuery({
    queryKey: ["overview", "audit"],
    queryFn: ({ signal }) => listAudit({ limit: 8, signal }),
  });

  const payments = paymentsQ.data?.items ?? [];
  const refunds = refundsQ.data?.items ?? [];
  const settlements = settlementsQ.data?.items ?? [];
  const ledger = ledgerQ.data?.items ?? [];
  const trades = tradesQ.data?.items ?? [];
  const catalogs = catalogsQ.data?.items ?? [];
  const users = usersQ.data?.items ?? [];
  const events = auditQ.data?.items ?? [];

  const loading =
    paymentsQ.isPending ||
    refundsQ.isPending ||
    settlementsQ.isPending ||
    ledgerQ.isPending ||
    tradesQ.isPending ||
    catalogsQ.isPending ||
    usersQ.isPending;

  // ---- Trade activity (from the energy ledger) --------------------------
  // Dedup the ledger to one row per trade (the BUYER + SELLER perspectives
  // collapse), classified within/cross, with the fields tiles + sparklines need.
  const tradeRows = useMemo(() => {
    const byTxn = new Map<string, LedgerRow>();
    for (const r of ledger) {
      if (r.transactionId && !byTxn.has(r.transactionId)) byTxn.set(r.transactionId, r);
    }
    return [...byTxn.values()].map((r) => {
      const buyerOurs = !!r.platformIdBuyer && OUR_PLATFORM_IDS.has(r.platformIdBuyer);
      const sellerOurs = !!r.platformIdSeller && OUR_PLATFORM_IDS.has(r.platformIdSeller);
      return {
        date: r.creationTime ?? r.tradeTime,
        within: buyerOurs && sellerOurs,
        energy: (r.tradeDetails ?? []).reduce((a, d) => a + (d.tradeQty ?? 0), 0),
      };
    });
  }, [ledger]);

  const activity = useMemo(() => {
    let confirmed = 0;
    let within = 0;
    let cross = 0;
    let energy = 0;
    for (const t of tradeRows) {
      if (!inWindow(t.date, days)) continue;
      confirmed += 1;
      if (t.within) within += 1;
      else cross += 1;
      energy += t.energy;
    }
    return { confirmed, within, cross, energy };
  }, [tradeRows, days]);

  // Daily trend series + period-over-period delta for the headline tiles.
  const series = useMemo(() => {
    const captured = payments.filter((p) =>
      ["PAID", "CONFIRMED_TO_BAP"].includes(upper(p.status))
    );
    return {
      confirmed: bucketize(tradeRows, (t) => t.date, () => 1, sparkDays, wantDelta),
      within: bucketize(tradeRows.filter((t) => t.within), (t) => t.date, () => 1, sparkDays, wantDelta),
      cross: bucketize(tradeRows.filter((t) => !t.within), (t) => t.date, () => 1, sparkDays, wantDelta),
      energy: bucketize(tradeRows, (t) => t.date, (t) => t.energy, sparkDays, wantDelta),
      captured: bucketize(captured, (p) => p.created_at, (p) => p.amount_paise ?? 0, sparkDays, wantDelta),
      paid: bucketize(
        settlements.filter((s) => upper(s.payout_leg?.status) === "PROCESSED"),
        (s) => s.created_at, (s) => s.payout_leg?.amount_paise ?? 0, sparkDays, wantDelta
      ),
      refunded: bucketize(
        refunds.filter((r) => upper(r.status) === "PROCESSED"),
        (r) => r.created_at, (r) => r.amount_paise ?? 0, sparkDays, wantDelta
      ),
      platformEarn: bucketize(
        settlements.filter((s) => upper(s.status) === "COMPLETE"),
        (s) => s.created_at, (s) => s.platform_earn_paise ?? 0, sparkDays, wantDelta
      ),
    };
  }, [tradeRows, payments, settlements, refunds, sparkDays, wantDelta]);

  // ---- Money ------------------------------------------------------------
  const money = useMemo(() => {
    const captured = payments
      .filter(
        (p) =>
          ["PAID", "CONFIRMED_TO_BAP"].includes(upper(p.status)) &&
          inWindow(p.created_at, days)
      )
      .reduce((sum, p) => sum + (p.amount_paise ?? 0), 0);

    // Paid out = payout legs the gateway PROCESSED (money actually left).
    const paidToSellers = settlements
      .filter((s) => inWindow(s.created_at, days) && upper(s.payout_leg?.status) === "PROCESSED")
      .reduce((sum, s) => sum + (s.payout_leg?.amount_paise ?? 0), 0);

    const refunded = refunds
      .filter((r) => upper(r.status) === "PROCESSED" && inWindow(r.created_at, days))
      .reduce((sum, r) => sum + (r.amount_paise ?? 0), 0);

    // Fees kept on completed settlements (0 while platform fees are 0).
    const platformEarn = settlements
      .filter((s) => upper(s.status) === "COMPLETE" && inWindow(s.created_at, days))
      .reduce((sum, s) => sum + (s.platform_earn_paise ?? 0), 0);

    return { captured, paidToSellers, refunded, platformEarn };
  }, [payments, settlements, refunds, days]);

  // ---- Operations & supply (mostly current-state) -----------------------
  const ops = useMemo(() => {
    const failedTrades = trades.filter(
      (t) => upper(t.state) === "FAILED" && inWindow(t.created_at, days)
    ).length;

    const inSettlement = settlements
      .filter((s) => PAYOUT_IN_FLIGHT.has(upper(s.payout_leg?.status)))
      .reduce((sum, s) => sum + (s.payout_leg?.amount_paise ?? 0), 0);

    const activeOffers = catalogs
      .filter((c) => c.is_active)
      .reduce((n, c) => n + (c.offer_count ?? 0), 0);

    const sellers = users.filter((u) => u.intent === "sell").length;
    const buyers = users.filter((u) => u.intent === "buy").length;
    const totalUsers = users.length;

    return { failedTrades, inSettlement, activeOffers, sellers, buyers, totalUsers };
  }, [trades, settlements, catalogs, users, days]);

  // ---- Needs-attention queue -------------------------------------------
  const queue = useMemo<QueueItem[]>(() => {
    const items: QueueItem[] = [];
    for (const p of payments) {
      if (upper(p.status) === "FAILED") {
        items.push({
          key: `pay-${p.order_id}`, kind: "Payment", id: p.order_id,
          status: p.status, amount: p.amount_paise, at: p.created_at,
          to: `/payments/${encodeURIComponent(p.order_id)}`,
        });
      }
    }
    for (const r of refunds) {
      const s = upper(r.status);
      if (s === "INITIATED" || s === "FAILED") {
        items.push({
          key: `ref-${r.razorpay_refund_id}`, kind: "Refund", id: r.razorpay_refund_id,
          status: r.status, amount: r.amount_paise, at: r.created_at, to: "/refunds",
        });
      }
    }
    for (const s of settlements) {
      const st = upper(s.status);
      if (st === "NEEDS_REVIEW" || st === "PARTIAL_STUCK") {
        items.push({
          key: `set-${s.txn_id}`, kind: "Settlement", id: s.txn_id,
          status: s.status, amount: s.payout_leg?.amount_paise ?? null,
          at: s.created_at, to: `/settlements/${encodeURIComponent(s.txn_id)}`,
        });
      }
    }
    return items.sort((a, b) => time(b.at) - time(a.at));
  }, [payments, refunds, settlements]);

  const v = (node: React.ReactNode) => (loading ? "—" : node);
  const delay = (i: number) => ({
    animationDelay: `${i * 30}ms`,
    animationFillMode: "backwards" as const,
  });

  return (
    <div>
      {/* Masthead */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-overline uppercase text-muted-foreground">{todayLabel()}</p>
          <h1 className="mt-1 font-display text-display font-medium text-foreground">
            Overview
          </h1>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs shadow-soft">
          {(["7d", "30d", "all"] as Window[]).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindow(w)}
              className={cn(
                "focus-ring rounded-md px-2.5 py-1 font-medium tabular-nums transition-colors",
                window === w
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {w === "all" ? "All time" : `Last ${w}`}
            </button>
          ))}
        </div>
      </div>

      {/* --- Trade activity ------------------------------------------------ */}
      <SectionLabel first>Trade activity</SectionLabel>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Confirmed trades" hint="on the energy ledger" icon={Activity}
          tone="info" value={v(num(activity.confirmed))} style={delay(0)}
          spark={series.confirmed.series} deltaPct={series.confirmed.deltaPct}
          onClick={() => navigate("/transactions")} />
        <StatCard label="Within our aggregator" hint="both sides on our platform" icon={Building2}
          tone="default" value={v(num(activity.within))} style={delay(1)}
          spark={series.within.series} deltaPct={series.within.deltaPct}
          onClick={() => navigate("/ledger")} />
        <StatCard label="Cross-aggregator" hint="interoperable trades" icon={Globe}
          tone="success" value={v(num(activity.cross))} style={delay(2)}
          spark={series.cross.series} deltaPct={series.cross.deltaPct}
          onClick={() => navigate("/ledger")} />
        <StatCard label="Energy traded" hint="delivered + scheduled" icon={Zap}
          tone="warning" value={v(kwh(activity.energy))} style={delay(3)}
          spark={series.energy.series} deltaPct={series.energy.deltaPct}
          onClick={() => navigate("/ledger")} />
      </div>

      {/* --- Money --------------------------------------------------------- */}
      <SectionLabel>Money</SectionLabel>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Captured" hint="from buyers" icon={Wallet} tone="success"
          value={v(rupees(money.captured))} style={delay(0)}
          spark={series.captured.series} deltaPct={series.captured.deltaPct}
          onClick={() => navigate("/payments?status=PAID")} />
        <StatCard label="Paid to sellers" hint="settlement payouts" icon={Banknote} tone="info"
          value={v(rupees(money.paidToSellers))} style={delay(1)}
          spark={series.paid.series} deltaPct={series.paid.deltaPct}
          onClick={() => navigate("/settlements")} />
        <StatCard label="Refunded" hint="back to buyers" icon={Undo2} tone="default"
          value={v(rupees(money.refunded))} style={delay(2)}
          spark={series.refunded.series} deltaPct={series.refunded.deltaPct}
          onClick={() => navigate("/refunds?status=PROCESSED")} />
        <StatCard label="Platform earnings" hint="fees kept" icon={Coins} tone="default"
          value={v(rupees(money.platformEarn))} style={delay(3)}
          spark={series.platformEarn.series} deltaPct={series.platformEarn.deltaPct}
          onClick={() => navigate("/settlements")} />
      </div>

      {/* --- Operations & supply (compact strip) --------------------------- */}
      <SectionLabel>Operations &amp; supply</SectionLabel>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard compact label="Needs attention" hint="payments & settlements" icon={ShieldAlert}
          tone={queue.length > 0 ? "danger" : "default"} value={v(queue.length)} style={delay(0)}
          onClick={() => navigate("/settlements?status=NEEDS_REVIEW")} />
        <StatCard compact label="Failed trades" hint="buyer-side failures" icon={XCircle}
          tone={ops.failedTrades > 0 ? "warning" : "default"} value={v(num(ops.failedTrades))} style={delay(1)}
          onClick={() => navigate("/transactions")} />
        <StatCard compact label="In settlement" hint="payout in flight" icon={Clock}
          tone="default" value={v(rupees(ops.inSettlement))} style={delay(2)}
          onClick={() => navigate("/settlements")} />
        <StatCard compact label="Active offers" hint="listed for sale" icon={Package}
          tone="default" value={v(num(ops.activeOffers))} style={delay(3)}
          onClick={() => navigate("/catalogs")} />
        <StatCard compact label="Sellers" hint="declared intent" icon={Store}
          tone="default" value={v(num(ops.sellers))} style={delay(4)}
          onClick={() => navigate("/users")} />
        <StatCard compact label="Buyers" hint="declared intent" icon={Users}
          tone="default" value={v(num(ops.buyers))} style={delay(5)}
          onClick={() => navigate("/users")} />
        <StatCard compact label="Total users" hint="registered" icon={Users}
          tone="default" value={v(num(ops.totalUsers))} style={delay(6)}
          onClick={() => navigate("/users")} />
      </div>

      {/* --- Work queue + activity ---------------------------------------- */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <SurfaceCard
            title="Needs attention"
            count={queue.length}
            footer={
              queue.length > 0 ? (
                <Link to="/settlements?status=NEEDS_REVIEW"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
                  Review settlements
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : undefined
            }
          >
            {queue.length === 0 ? (
              <QueueEmpty loading={loading} />
            ) : (
              <ul>
                {queue.slice(0, 8).map((item) => (
                  <li key={item.key}>
                    <Link to={item.to}
                      className="group flex items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors last:border-b-0 hover:bg-primary/[0.05]">
                      <span className="w-20 shrink-0 text-overline uppercase text-muted-foreground">
                        {item.kind}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/90">
                        {item.id}
                      </span>
                      <StatusPill status={item.status} />
                      <span className="w-24 shrink-0 text-right text-[13px] font-medium tabular-nums text-foreground">
                        {item.amount != null ? rupees(item.amount) : "—"}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SurfaceCard>
        </section>

        <section className="lg:col-span-5">
          <SurfaceCard
            title="Recent activity"
            footer={
              <Link to="/audit"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
                Open audit log
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {events.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                {auditQ.isPending ? "Loading…" : "No activity yet."}
              </div>
            ) : (
              <ol className="relative px-4 py-3">
                <span aria-hidden className="absolute bottom-4 left-[1.35rem] top-4 w-px bg-border" />
                {events.map((event) => (
                  <li key={event.action_id} className="relative flex gap-3 py-2">
                    <span className="relative z-10 mt-1 h-2 w-2 shrink-0 rounded-full bg-primary ring-4 ring-card" />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-[13px] text-foreground">
                        {statusLabel(event.action)}
                        <span className="text-muted-foreground">{" · "}{event.target_type}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate font-mono">
                          {event.admin_phone ?? event.admin_uid}
                        </span>
                        <TimeCell value={event.created_at} className="text-[11px]" />
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SurfaceCard>
        </section>
      </div>
    </div>
  );
}

function SectionLabel({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <h2 className={cn(
      "mb-3 text-overline uppercase tracking-wider text-muted-foreground/70",
      first ? "mt-0" : "mt-7"
    )}>
      {children}
    </h2>
  );
}

function SurfaceCard({
  title, count, footer, children,
}: {
  title: string;
  count?: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col overflow-clip rounded-xl border border-border bg-card shadow-soft">
      <div className="flex items-center gap-2 border-b border-border bg-muted/55 px-4 py-2.5">
        <h2 className="text-overline uppercase text-muted-foreground">{title}</h2>
        {count != null && count > 0 && (
          <span className="rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold tabular-nums text-primary">
            {count}
          </span>
        )}
      </div>
      <div className="flex-1">{children}</div>
      {footer && <div className="border-t border-border px-4 py-2.5">{footer}</div>}
    </div>
  );
}

function QueueEmpty({ loading }: { loading: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success/10 text-success ring-1 ring-inset ring-success/20">
        <CheckCircle2 className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <p className="text-sm font-semibold text-foreground">
        {loading ? "Checking…" : "Nothing needs attention"}
      </p>
      <p className="text-[13px] text-muted-foreground">
        {loading
          ? "Loading recent payments, refunds and settlements."
          : "No failed payments, pending refunds, or settlements to review."}
      </p>
    </div>
  );
}
