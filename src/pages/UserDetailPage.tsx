import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowUpRight,
  ChevronRight,
  FilePlus2,
  LogIn,
  ShoppingBag,
  Tag,
  User,
} from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ObjectHeader } from "@/components/ui/ObjectHeader";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { fmtAmount, fmtDate } from "@/lib/format";
import {
  getUserActivity,
  type ActivityEvent,
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
