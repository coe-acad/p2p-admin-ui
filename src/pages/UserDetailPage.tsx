import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowUpRight,
  ChevronRight,
  FilePlus2,
  LogIn,
  Pencil,
  ShoppingBag,
  Tag,
  User,
  Wallet,
} from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { BackLink } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { ObjectHeader } from "@/components/ui/ObjectHeader";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { fmtAmount, fmtDate } from "@/lib/format";
import {
  getSellerPayout,
  getUserActivity,
  updateSellerPayout,
  type ActivityEvent,
  type SellerPayoutAccount,
} from "@/services/adminApi";
import { toApiError } from "@/services/apiClient";

const eventTypeMeta: Record<
  string,
  { label: string; tone: "info" | "success" | "warning" | "danger" | "default" }
> = {
  catalog_published: { label: "Catalog", tone: "success" },
  trade_as_buyer: { label: "Bought", tone: "info" },
  trade_as_seller: { label: "Sold", tone: "default" },
  login: { label: "Login", tone: "default" },
};

const toneDot: Record<string, string> = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  danger: "bg-destructive",
  default: "bg-muted-foreground/50",
};

const formatPhone = (raw: string): string => {
  const m = raw.match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : raw;
};

const linkFor = (event: ActivityEvent): string | undefined => {
  const txn = event.transaction_id as string | undefined;
  const cat = event.catalog_id as string | undefined;
  if (event.type === "catalog_published" && cat)
    return `/catalogs/${encodeURIComponent(cat)}`;
  if (event.type === "trade_as_buyer" && txn)
    return `/transactions/buyer/${encodeURIComponent(txn)}`;
  if (event.type === "trade_as_seller" && txn)
    return `/transactions/seller/${encodeURIComponent(txn)}`;
  return undefined;
};

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_RE = /^\d{6,18}$/;
const VPA_RE = /^[a-z0-9][a-z0-9._-]*@[a-z0-9]+$/;

const inputCls =
  "focus-ring mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors hover:border-input/80";

/** Seller payout method: masked current view + an admin change modal. The
 * self-serve app locks payout details after first setup, so this is the only
 * way to correct a wrong account. A change creates a fresh RazorpayX fund
 * account, archives the old one, and re-activates the record. */
function SellerPayoutCard({ phone }: { phone: string }) {
  const [account, setAccount] = useState<SellerPayoutAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"bank" | "upi">("bank");
  const [holder, setHolder] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccount, setConfirmAccount] = useState("");
  const [vpa, setVpa] = useState("");
  const [reason, setReason] = useState("");
  const [requestId, setRequestId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSellerPayout(phone)
      .then((a) => {
        if (!cancelled) {
          setAccount(a);
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(toApiError(err, "Failed to load payout method").message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [phone]);

  const openModal = () => {
    setMode("bank");
    setHolder(account?.account_holder_name ?? "");
    setIfsc("");
    setAccountNumber("");
    setConfirmAccount("");
    setVpa("");
    setReason("");
    setDialogError(null);
    setRequestId(crypto.randomUUID());
    setOpen(true);
  };

  const closeModal = () => {
    if (!submitting) setOpen(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const holderName = holder.trim();
    if (holderName.length < 3) {
      setDialogError("Enter the account holder name (3+ characters).");
      return;
    }
    if (mode === "bank") {
      const acc = accountNumber.replace(/\s/g, "");
      if (!IFSC_RE.test(ifsc.trim().toUpperCase())) {
        setDialogError("Enter a valid IFSC, like HDFC0001234.");
        return;
      }
      if (!ACCOUNT_RE.test(acc)) {
        setDialogError("Enter an account number of 6–18 digits.");
        return;
      }
      if (acc !== confirmAccount.replace(/\s/g, "")) {
        setDialogError("Account numbers don't match.");
        return;
      }
    } else if (!VPA_RE.test(vpa.trim().toLowerCase())) {
      setDialogError("Enter a valid UPI ID, like name@bank.");
      return;
    }
    if (reason.trim().length < 5) {
      setDialogError("A reason of at least 5 characters is required.");
      return;
    }

    setSubmitting(true);
    setDialogError(null);
    try {
      const updated = await updateSellerPayout(
        phone,
        mode === "bank"
          ? {
              mode,
              account_holder_name: holderName,
              ifsc: ifsc.trim().toUpperCase(),
              account_number: accountNumber.replace(/\s/g, ""),
              seller_name: holderName,
            }
          : {
              mode,
              account_holder_name: holderName,
              vpa: vpa.trim().toLowerCase(),
              seller_name: holderName,
            },
        reason.trim(),
        requestId
      );
      setAccount(updated);
      setOpen(false);
    } catch (err) {
      setDialogError(toApiError(err, "Failed to update payout method").message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mb-6">
      <Card title="Payout method">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : loadError ? (
          <Alert tone="danger">{loadError}</Alert>
        ) : account ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-foreground">
                    {account.masked_target ?? "—"}
                  </span>
                  <Badge
                    variant={account.status === "active" ? "success" : "neutral"}
                  >
                    {account.status === "active" ? "active" : "disabled"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {account.mode === "bank" ? "Bank" : "UPI"} ·{" "}
                  {account.account_holder_name ?? "—"}
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={openModal}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Change
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              No payout method on file for this seller.
            </p>
            <Button variant="secondary" onClick={openModal}>
              Add payout method
            </Button>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={closeModal}
        title={account ? "Change payout method" : "Add payout method"}
        description="Creates a new RazorpayX payout account; the old one is archived and future settlements pay here."
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              onClick={(event) => submit(event as unknown as React.FormEvent)}
            >
              Save payout method
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2">
            {(["bank", "upi"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`focus-ring flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  mode === m
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-input text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "bank" ? "Bank account" : "UPI"}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-overline uppercase text-muted-foreground">
              Account holder name
            </label>
            <input
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              className={inputCls}
              placeholder="As on the account"
            />
          </div>

          {mode === "bank" ? (
            <>
              <div>
                <label className="block text-overline uppercase text-muted-foreground">
                  IFSC
                </label>
                <input
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  className={inputCls}
                  placeholder="HDFC0001234"
                />
              </div>
              <div>
                <label className="block text-overline uppercase text-muted-foreground">
                  Account number
                </label>
                <input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className={inputCls}
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="block text-overline uppercase text-muted-foreground">
                  Confirm account number
                </label>
                <input
                  value={confirmAccount}
                  onChange={(e) => setConfirmAccount(e.target.value)}
                  className={inputCls}
                  inputMode="numeric"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-overline uppercase text-muted-foreground">
                UPI ID
              </label>
              <input
                value={vpa}
                onChange={(e) => setVpa(e.target.value)}
                className={inputCls}
                placeholder="name@bank"
              />
            </div>
          )}

          <div>
            <label className="block text-overline uppercase text-muted-foreground">
              Reason (required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Ticket # / why the payout account is being changed…"
              className={inputCls}
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

export function UserDetailPage() {
  const { phone = "" } = useParams<{ phone: string }>();
  const [activity, setActivity] = useState<{
    counts: Record<string, number>;
    events: ActivityEvent[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUserActivity(phone)
      .then((data) => {
        if (cancelled) return;
        setActivity({ counts: data.counts, events: data.events });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(toApiError(err, "Failed to load user activity").message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [phone]);

  const events = (activity?.events ?? []).filter((e) => e.type !== "login");

  return (
    <div>
      <BackLink to="/users">Back to users</BackLink>

      <ObjectHeader
        seed={phone}
        icon={User}
        title={formatPhone(phone)}
        copyId={{ value: phone }}
      />

      {activity && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Catalogs"
            value={activity.counts.catalogs ?? 0}
            icon={FilePlus2}
            tone="success"
            style={{ animationDelay: "0ms", animationFillMode: "backwards" }}
          />
          <StatCard
            label="Bought"
            value={activity.counts.trades_as_buyer ?? 0}
            icon={ShoppingBag}
            tone="info"
            style={{ animationDelay: "40ms", animationFillMode: "backwards" }}
          />
          <StatCard
            label="Sold"
            value={activity.counts.trades_as_seller ?? 0}
            icon={Tag}
            tone="default"
            style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
          />
          <StatCard
            label="Logins"
            value={activity.counts.logins ?? 0}
            icon={LogIn}
            tone="default"
            style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
          />
        </div>
      )}

      <SellerPayoutCard phone={phone} />

      {error && (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <Card title="Activity timeline" padded={false}>
        {loading && (
          <div className="p-4">
            <SkeletonRows rows={4} columns={3} bare />
          </div>
        )}

        {!loading && activity && events.length === 0 && (
          <EmptyState
            bare
            icon={LogIn}
            title="No activity recorded for this user."
            description="Once they publish a catalog, complete a transaction, or log in, you'll see it here."
          />
        )}

        {!loading && events.length > 0 && (
          <ol className="relative px-5 py-3">
            {/* connecting rail behind the dots */}
            <span
              aria-hidden
              className="absolute bottom-6 left-[1.9rem] top-6 w-px bg-border"
            />
            {events.map((event, idx) => {
              const meta =
                eventTypeMeta[event.type] ?? {
                  label: event.type.replace(/_/g, " "),
                  tone: "default" as const,
                };
              const ref =
                (event.transaction_id as string | undefined) ??
                (event.catalog_id as string | undefined);
              const to = linkFor(event);
              const isTrade =
                event.type === "trade_as_buyer" ||
                event.type === "trade_as_seller";

              const body = (
                <>
                  <span
                    className={`relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-card ${
                      toneDot[meta.tone] ?? toneDot.default
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={meta.tone}>{meta.label}</Badge>
                      {isTrade && (
                        <>
                          <Badge asStatus={event.state as string | null}>
                            {(event.state as string | null) ?? "—"}
                          </Badge>
                          <span className="nums text-sm font-medium text-foreground">
                            {fmtAmount(event.total_amount as number | null)}
                          </span>
                        </>
                      )}
                      {event.type === "catalog_published" && (
                        <Badge
                          variant={
                            (event.is_active as boolean) ? "success" : "neutral"
                          }
                        >
                          {(event.is_active as boolean) ? "active" : "inactive"}
                        </Badge>
                      )}
                    </div>
                    {ref &&
                      (to ? (
                        <span className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-primary group-hover:underline">
                          {ref}
                          <ArrowUpRight className="h-3 w-3" />
                        </span>
                      ) : (
                        <p className="mt-1 font-mono text-xs text-muted-foreground/70">
                          {ref}
                        </p>
                      ))}
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground/70">
                    {fmtDate(event.created_at)}
                  </span>
                  {to && (
                    <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" />
                  )}
                </>
              );

              return (
                <li key={idx} className="relative">
                  {to ? (
                    <Link
                      to={to}
                      className="group flex items-start gap-4 rounded-lg py-3 pr-2 transition-colors hover:bg-primary/[0.05]"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="group flex items-start gap-4 py-3 pr-2">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
