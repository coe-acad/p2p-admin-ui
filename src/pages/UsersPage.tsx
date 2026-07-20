import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react";
import type { ColDef } from "ag-grid-community";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataGrid } from "@/components/ui/DataGrid";
import { GridCard } from "@/components/ui/GridCard";
import { IdCell, TimeCell } from "@/components/ui/cells";
import { ListPageState } from "@/components/ui/ListPageState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager } from "@/components/ui/Pager";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import { useCursorPager } from "@/hooks/useCursorPager";
import { useDrawerParam } from "@/hooks/useDrawerParam";
import { cn } from "@/lib/utils";
import { listUsers, type UserRow } from "@/services/adminApi";

const intentTabs: Array<{ key: string; label: string }> = [
  { key: "", label: "All" },
  { key: "buy", label: "Buyers" },
  { key: "sell", label: "Sellers" },
];

export function UsersPage() {
  const navigate = useNavigate();
  const [intent, setIntent] = useState<string>("");

  const filters = useMemo(() => ({ intent }), [intent]);

  const fetcher = useCallback(
    (
      { cursor, limit }: { cursor: string | null; limit: number },
      { signal }: { signal: AbortSignal }
    ) =>
      listUsers({
        cursor: cursor ?? undefined,
        limit,
        intent: intent || undefined,
        signal,
      }),
    [intent]
  );

  const pager = useCursorPager<UserRow>({
    resource: "users",
    filters,
    fetcher,
  });

  const drawer = useDrawerParam();
  const selected = useMemo(
    () =>
      drawer.id ? pager.rows.find((r) => r.phone_number === drawer.id) : null,
    [drawer.id, pager.rows]
  );

  const hasFilters = intent !== "";
  const clearFilters = () => {
    setIntent("");
  };

  const columns = useMemo<ColDef<UserRow>[]>(
    () => [
      {
        headerName: "User",
        field: "phone_number",
        flex: 1.4,
        cellRenderer: (p: { data: UserRow }) => {
          const initials =
            (p.data.name ?? p.data.phone_number ?? "??").trim().slice(0, 2);
          return (
            <div className="flex items-center gap-2 leading-tight">
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-semibold uppercase text-primary"
              >
                {initials}
              </span>
              <div className="min-w-0">
                {p.data.name && (
                  <p className="truncate text-xs font-medium text-foreground">
                    {p.data.name}
                  </p>
                )}
                <p
                  className={cn(
                    "font-mono text-xs",
                    p.data.name ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {p.data.phone_number}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        headerName: "Intent",
        field: "intent",
        width: 130,
        cellRenderer: (p: { value: string | null }) =>
          p.value ? (
            <Badge variant={p.value === "buy" ? "info" : "violet"} className="capitalize">
              {p.value}
            </Badge>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          ),
      },
      {
        headerName: "VC",
        field: "is_vc_verified",
        width: 130,
        cellRenderer: (p: { data: UserRow }) =>
          p.data.is_vc_verified ? (
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70">
              <ShieldOff className="h-3.5 w-3.5" /> Pending
            </span>
          ),
      },
      {
        headerName: "VC types",
        field: "vc_types",
        flex: 1.2,
        cellRenderer: (p: { data: UserRow }) =>
          p.data.vc_types.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {p.data.vc_types.join(", ")}
            </span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          ),
      },
      {
        headerName: "Joined",
        field: "created_at",
        width: 200,
        cellRenderer: (p: { data: UserRow }) => (
          <TimeCell value={p.data.created_at} />
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Users"
        actions={
          <Button
            onClick={() => pager.refetch()}
            variant="secondary"
            disabled={pager.isFetching}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", pager.isFetching && "animate-spin")}
            />
            Refresh
          </Button>
        }
      />

      <div className="mb-4">
        <SegmentedControl
          tabs={intentTabs}
          value={intent}
          onChange={setIntent}
          layoutId="users-intent"
        />
      </div>

      <ListPageState
        status={
          pager.isError ? "error" : pager.isPending ? "pending" : "success"
        }
        rows={pager.rows}
        error={pager.error}
        onRetry={() => pager.refetch()}
        onClearFilters={hasFilters ? clearFilters : undefined}
        hasFilters={hasFilters}
        resourceLabel="users"
        columns={5}
      >
        <GridCard>
          <DataGrid<UserRow>
            rows={pager.rows}
            columns={columns}
            serverPaged
            framed={false}
            fetching={pager.isFetching && !pager.isPending}
            rowKey="phone_number"
            onRowClick={(row) => drawer.open(row.phone_number)}
          />
          <Pager
            footer
            page={pager.page}
            pageCount={pager.pageCount}
            pageSize={pager.pageSize}
            onPageSize={pager.setPageSize}
            hasPrev={pager.hasPrev}
            hasNext={pager.hasNext}
            onPrev={pager.prev}
            onNext={pager.next}
            isFetching={pager.isFetching && !pager.isPending}
          />
        </GridCard>
      </ListPageState>

      <Sheet open={drawer.isOpen} onOpenChange={drawer.setOpen}>
        <SheetContent width="520px">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  {selected.intent && (
                    <Badge
                      variant={selected.intent === "buy" ? "info" : "violet"}
                      className="capitalize"
                    >
                      {selected.intent}
                    </Badge>
                  )}
                  {selected.is_vc_verified ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <ShieldCheck className="h-3.5 w-3.5" /> VC verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <ShieldOff className="h-3.5 w-3.5" /> VC pending
                    </span>
                  )}
                </div>
                <SheetTitle>
                  {selected.name ?? selected.phone_number}
                </SheetTitle>
                {selected.name && (
                  <p className="font-mono text-xs text-muted-foreground">
                    {selected.phone_number}
                  </p>
                )}
              </SheetHeader>
              <SheetBody>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <MetaRow label="Joined" value={<TimeCell value={selected.created_at} />} />
                  <MetaRow label="Last updated" value={<TimeCell value={selected.updated_at} />} />
                  <MetaRow
                    label="VC types"
                    value={selected.vc_types.join(", ") || "—"}
                    span
                  />
                  <MetaRow
                    label="Phone"
                    value={<IdCell value={selected.phone_number} max={20} />}
                    span
                  />
                </dl>
                <div className="mt-6 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={() =>
                      navigate(
                        `/users/${encodeURIComponent(selected.phone_number)}`
                      )
                    }
                  >
                    Open full profile
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ------- Local helpers ----------------------------------------------------

function MetaRow({
  label,
  value,
  span,
}: {
  label: string;
  value: React.ReactNode;
  span?: boolean;
}) {
  return (
    <div className={span ? "col-span-2" : undefined}>
      <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs text-foreground">{value}</dd>
    </div>
  );
}

