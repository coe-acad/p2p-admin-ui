import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Undo2,
  Wallet,
} from "lucide-react";

import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { Tooltip } from "@/components/ui/Tooltip";
import { TimeCell } from "@/components/ui/cells";
import {
  listAudit,
  listPayments,
  listRefunds,
  listSettlements,
} from "@/services/adminApi";
import { statusLabel } from "@/lib/format";

const upper = (s: string | null | undefined) => (s ?? "").toUpperCase();

const time = (iso: string | null | undefined) =>
  iso ? new Date(iso).getTime() : 0;

// ₹, rounded to whole rupees, currency mark one step muted.
const rupees = (paise: number) => (
  <span>
    <span className="text-muted-foreground/60">₹</span>
    {Math.round(paise / 100).toLocaleString("en-IN")}
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

  const paymentsQ = useQuery({
    queryKey: ["overview", "payments"],
    queryFn: ({ signal }) => listPayments({ limit: 100, signal }),
  });
  const refundsQ = useQuery({
    queryKey: ["overview", "refunds"],
    queryFn: ({ signal }) => listRefunds({ limit: 100, signal }),
  });
  const settlementsQ = useQuery({
    queryKey: ["overview", "settlements"],
    queryFn: ({ signal }) => listSettlements({ limit: 100, signal }),
  });
  const auditQ = useQuery({
    queryKey: ["overview", "audit"],
    queryFn: ({ signal }) => listAudit({ limit: 8, signal }),
  });

  const payments = paymentsQ.data?.items ?? [];
  const refunds = refundsQ.data?.items ?? [];
  const settlements = settlementsQ.data?.items ?? [];
  const events = auditQ.data?.items ?? [];

  const stats = useMemo(() => {
    const captured = payments
      .filter((p) => ["PAID", "CONFIRMED_TO_BAP"].includes(upper(p.status)))
      .reduce((sum, p) => sum + (p.amount_paise ?? 0), 0);

    const paidToSellers = settlements.reduce((sum, s) => {
      const leg = s.payout_leg;
      return leg && upper(leg.status) === "COMPLETE"
        ? sum + (leg.amount_paise ?? 0)
        : sum;
    }, 0);

    const refunded = refunds
      .filter((r) => upper(r.status) === "PROCESSED")
      .reduce((sum, r) => sum + (r.amount_paise ?? 0), 0);

    return { captured, paidToSellers, refunded };
  }, [payments, settlements, refunds]);

  const queue = useMemo<QueueItem[]>(() => {
    const items: QueueItem[] = [];

    for (const p of payments) {
      if (upper(p.status) === "FAILED") {
        items.push({
          key: `pay-${p.order_id}`,
          kind: "Payment",
          id: p.order_id,
          status: p.status,
          amount: p.amount_paise,
          at: p.created_at,
          to: `/payments/${encodeURIComponent(p.order_id)}`,
        });
      }
    }
    for (const r of refunds) {
      const s = upper(r.status);
      if (s === "INITIATED" || s === "FAILED") {
        items.push({
          key: `ref-${r.razorpay_refund_id}`,
          kind: "Refund",
          id: r.razorpay_refund_id,
          status: r.status,
          amount: r.amount_paise,
          at: r.created_at,
          to: "/refunds",
        });
      }
    }
    for (const s of settlements) {
      const st = upper(s.status);
      if (st === "NEEDS_REVIEW" || st === "PARTIAL_STUCK") {
        items.push({
          key: `set-${s.txn_id}`,
          kind: "Settlement",
          id: s.txn_id,
          status: s.status,
          amount: s.payout_leg?.amount_paise ?? null,
          at: s.created_at,
          to: `/settlements/${encodeURIComponent(s.txn_id)}`,
        });
      }
    }

    return items.sort((a, b) => time(b.at) - time(a.at));
  }, [payments, refunds, settlements]);

  const loadingStats =
    paymentsQ.isPending || refundsQ.isPending || settlementsQ.isPending;

  return (
    <div>
      {/* Masthead */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-overline uppercase text-muted-foreground">
            {todayLabel()}
          </p>
          <h1 className="mt-1 font-display text-display font-medium text-foreground">
            Overview
          </h1>
        </div>
        <Tooltip content="Figures cover the most recent 100 records in each area.">
          <span className="hidden shrink-0 cursor-default items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Live
          </span>
        </Tooltip>
      </div>

      {/* KPI band — the money flow */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Captured"
          hint="from buyers"
          icon={Wallet}
          tone="success"
          value={loadingStats ? "—" : rupees(stats.captured)}
          onClick={() => navigate("/payments?status=PAID")}
          style={{ animationDelay: "0ms", animationFillMode: "backwards" }}
        />
        <StatCard
          label="Paid to sellers"
          hint="settlement payouts"
          icon={Banknote}
          tone="info"
          value={loadingStats ? "—" : rupees(stats.paidToSellers)}
          onClick={() => navigate("/settlements")}
          style={{ animationDelay: "40ms", animationFillMode: "backwards" }}
        />
        <StatCard
          label="Refunded"
          hint="back to buyers"
          icon={Undo2}
          tone="default"
          value={loadingStats ? "—" : rupees(stats.refunded)}
          onClick={() => navigate("/refunds?status=PROCESSED")}
          style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
        />
        <StatCard
          label="Needs attention"
          hint="payments & settlements"
          icon={ShieldAlert}
          tone={queue.length > 0 ? "danger" : "default"}
          value={loadingStats ? "—" : queue.length}
          onClick={() => navigate("/settlements?status=NEEDS_REVIEW")}
          style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
        />
      </div>

      {/* Work queue + activity */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <SurfaceCard
            title="Needs attention"
            count={queue.length}
            footer={
              queue.length > 0 ? (
                <Link
                  to="/settlements?status=NEEDS_REVIEW"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
                >
                  Review settlements
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : undefined
            }
          >
            {queue.length === 0 ? (
              <QueueEmpty loading={loadingStats} />
            ) : (
              <ul>
                {queue.slice(0, 8).map((item) => (
                  <li key={item.key}>
                    <Link
                      to={item.to}
                      className="group flex items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors last:border-b-0 hover:bg-primary/[0.05]"
                    >
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
              <Link
                to="/audit"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
              >
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
                <span
                  aria-hidden
                  className="absolute bottom-4 left-[1.35rem] top-4 w-px bg-border"
                />
                {events.map((event) => (
                  <li key={event.action_id} className="relative flex gap-3 py-2">
                    <span className="relative z-10 mt-1 h-2 w-2 shrink-0 rounded-full bg-primary ring-4 ring-card" />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-[13px] text-foreground">
                        {statusLabel(event.action)}
                        <span className="text-muted-foreground">
                          {" · "}
                          {event.target_type}
                        </span>
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

function SurfaceCard({
  title,
  count,
  footer,
  children,
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
      {footer && (
        <div className="border-t border-border px-4 py-2.5">{footer}</div>
      )}
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
