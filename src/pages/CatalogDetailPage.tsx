import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  CalendarClock,
  Gauge,
  MapPin,
  RefreshCw,
  Sun,
  Wind,
  Zap,
} from "lucide-react";
import type { ColDef } from "ag-grid-community";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { BackLink } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import { DataGrid } from "@/components/ui/DataGrid";
import { IdCell, MoneyCell, TimeCell } from "@/components/ui/cells";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { getCatalog, type Offer } from "@/services/adminApi";

const sourceIcon = (source: string | null): typeof Sun => {
  if (!source) return Zap;
  const s = source.toUpperCase();
  if (s === "SOLAR") return Sun;
  if (s === "WIND") return Wind;
  return Zap;
};

const sourceTone = (source: string | null): string => {
  if (!source) return "bg-muted text-muted-foreground";
  const s = source.toUpperCase();
  if (s === "SOLAR") return "bg-warning/10 text-warning-strong ring-warning/25";
  if (s === "WIND") return "bg-info/10 text-info ring-info/20";
  return "bg-primary/10 text-primary ring-primary/20";
};

export function CatalogDetailPage() {
  const { catalogId } = useParams<{ catalogId: string }>();

  const q = useQuery({
    queryKey: ["catalog", "detail", catalogId],
    queryFn: ({ signal }) => getCatalog(catalogId ?? "", { signal }),
    enabled: Boolean(catalogId),
  });

  const offerColumns = useMemo<ColDef<Offer>[]>(
    () => [
      {
        headerName: "Source",
        field: "source_type",
        width: 130,
        cellRenderer: (p: { data: Offer }) => {
          const Icon = sourceIcon(p.data.source_type);
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset",
                sourceTone(p.data.source_type)
              )}
            >
              <Icon className="h-3 w-3" />
              {p.data.source_type ?? "—"}
            </span>
          );
        },
      },
      {
        headerName: "Offer",
        field: "offer_id",
        flex: 1,
        cellRenderer: (p: { data: Offer }) => (
          <div className="min-w-0 leading-tight">
            <IdCell value={p.data.offer_id} max={22} />
            {p.data.pricing_model && (
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {p.data.pricing_model}
              </p>
            )}
          </div>
        ),
      },
      {
        headerName: "Rate",
        field: "price_per_unit",
        width: 130,
        cellRenderer: (p: { data: Offer }) => (
          <div className="text-right leading-tight">
            <MoneyCell
              rupees={p.data.price_per_unit}
              currency={p.data.currency}
            />
            <p className="text-[10px] text-muted-foreground/70">
              / {p.data.unit ?? "kWh"}
            </p>
          </div>
        ),
      },
      {
        headerName: "Quantity",
        field: "quantity_kwh",
        width: 220,
        cellRenderer: (p: { data: Offer }) => <QuantityCell offer={p.data} />,
      },
      {
        headerName: "Delivery",
        field: "delivery_start",
        width: 220,
        cellRenderer: (p: { data: Offer }) => (
          <WindowCell start={p.data.delivery_start} end={p.data.delivery_end} />
        ),
      },
      {
        headerName: "Validity",
        field: "validity_start",
        width: 220,
        cellRenderer: (p: { data: Offer }) => (
          <WindowCell start={p.data.validity_start} end={p.data.validity_end} />
        ),
      },
      {
        headerName: "Location",
        field: "location",
        width: 200,
        cellRenderer: (p: { data: Offer }) => (
          <div className="min-w-0 leading-tight text-xs text-muted-foreground">
            {p.data.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {p.data.location}
              </span>
            ) : (
              <span className="text-muted-foreground/50">—</span>
            )}
            {p.data.meter_id && (
              <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground/80">
                <Gauge className="h-3 w-3" />
                {p.data.meter_id}
              </p>
            )}
          </div>
        ),
      },
      {
        headerName: "Status",
        field: "is_active",
        width: 110,
        cellRenderer: (p: { data: Offer }) =>
          p.data.is_active ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="neutral">Inactive</Badge>
          ),
      },
    ],
    []
  );

  return (
    <div>
      <BackLink to="/catalogs">Back to catalogs</BackLink>

      <PageHeader
        eyebrow="Catalog"
        title={q.data?.seller_name ?? "Catalog"}
        actions={
          <Button
            onClick={() => q.refetch()}
            variant="secondary"
            disabled={q.isFetching}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", q.isFetching && "animate-spin")}
            />
            Refresh
          </Button>
        }
      />

      {q.isPending && (
        <div className="mb-4">
          <SkeletonRows rows={6} columns={7} />
        </div>
      )}

      {q.isError && (
        <Alert tone="danger">
          Couldn't load catalog:{" "}
          {(q.error as { message?: string } | null)?.message ?? "unknown"}
        </Alert>
      )}

      {q.data && (
        <>
          <MetaGrid catalog={q.data} />

          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Offers</h3>
            <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {q.data.offer_count}
            </span>
          </div>

          <DataGrid<Offer>
            rows={q.data.offers}
            columns={offerColumns}
            serverPaged
            rowHeight={56}
            rowKey="offer_id"
          />
        </>
      )}
    </div>
  );
}

// -------- Local pieces ----------------------------------------------------

function MetaGrid({ catalog }: { catalog: NonNullable<ReturnType<typeof useQuery<Awaited<ReturnType<typeof getCatalog>>>>['data']> }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-5 shadow-soft sm:grid-cols-4"
    >
      <Field
        label="Status"
        value={
          catalog.is_active ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="neutral">Inactive</Badge>
          )
        }
      />
      <Field
        label="Owner"
        value={
          catalog.owner_mobile ? (
            <Link
              to={`/users/${encodeURIComponent(catalog.owner_mobile)}`}
              className="font-mono text-sm text-primary hover:underline"
            >
              {catalog.owner_mobile}
            </Link>
          ) : (
            "—"
          )
        }
      />
      <Field
        label="Catalog id"
        value={<IdCell value={catalog.catalog_id} max={22} />}
      />
      <Field
        label="Network id"
        value={<IdCell value={catalog.bpp_id} max={22} />}
      />
      <Field
        label="Offers"
        value={
          <span className="tabular-nums font-mono text-sm text-foreground">
            {catalog.offer_count}
          </span>
        }
      />
      <Field label="Published" value={<TimeCell value={catalog.created_at} />} />
      <Field label="Updated" value={<TimeCell value={catalog.updated_at} />} />
    </motion.div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-overline uppercase text-muted-foreground">{label}</p>
      <div className="mt-1">{value}</div>
    </div>
  );
}

function QuantityCell({ offer }: { offer: Offer }) {
  const qty = offer.quantity_kwh;
  const sold = offer.sold_kwh ?? 0;
  if (qty == null) {
    return <span className="text-muted-foreground/50">—</span>;
  }
  return (
    <span className="inline-flex items-baseline gap-1 text-xs text-foreground/90">
      <Zap className="h-3 w-3 self-center text-warning-strong" />
      <span className="tabular-nums font-mono">
        {sold.toFixed(2)}
        <span className="text-muted-foreground/70">/</span>
        {qty.toFixed(2)}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {offer.unit ?? "kWh"}
      </span>
    </span>
  );
}

function WindowCell({
  start,
  end,
}: {
  start: string | null;
  end: string | null;
}) {
  if (!start && !end) {
    return <span className="text-muted-foreground/50">—</span>;
  }
  return (
    <div className="leading-tight text-xs">
      <div className="flex items-center gap-1">
        <CalendarClock className="h-3 w-3 text-muted-foreground/70" />
        <TimeCell value={start} />
      </div>
      {end && (
        <div className="mt-0.5 flex items-center gap-1 text-muted-foreground">
          <CalendarCheck className="h-3 w-3" />
          <TimeCell value={end} />
        </div>
      )}
    </div>
  );
}
