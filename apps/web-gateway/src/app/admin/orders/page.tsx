"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Package } from "lucide-react";
import type { Order, Shipment } from "@atelier/contracts";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import { useApiResource } from "@/lib/client/hooks";
import type { Artwork } from "@/types";

type AdminOrder = Order & { shipment: Shipment | null };

const STATUS_OPTIONS = ["all", "pending", "confirmed", "paid", "shipped", "completed", "cancelled"] as const;
const PAGE_SIZE = 25;

function statusVariant(status: Order["status"]): "outline" | "warning" | "success" | "destructive" {
  if (status === "cancelled") return "destructive";
  if (status === "completed") return "success";
  if (status === "pending" || status === "confirmed") return "warning";
  return "outline";
}

function OrderRow({ order }: { order: AdminOrder }) {
  const { data: artwork } = useApiResource<Artwork>(`/api/artworks/${encodeURIComponent(order.artworkId)}`);
  const address = order.shippingAddress;

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-body font-medium text-foreground">{artwork?.title ?? order.artworkId}</p>
          <p className="mt-0.5 text-caption text-muted-foreground">
            Order {order.id.slice(0, 8)} · {new Date(order.createdAt).toLocaleString("en-US")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-body-sm font-medium text-foreground">{formatPrice(order.totalAmount, order.currency)}</p>
          <Badge variant={statusVariant(order.status)} className="capitalize">
            {order.status}
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <div>
          <p className="text-caption font-medium text-foreground">Buyer &amp; shipping address</p>
          <p className="mt-1 text-body-sm text-muted-foreground">
            {address.fullName}
            <br />
            {address.address}, {address.city}
            {address.state ? `, ${address.state}` : ""} {address.postalCode ?? ""}
            <br />
            {address.country ?? ""}
            {address.phone ? ` · ${address.phone}` : ""}
          </p>
          <p className="mt-1 text-caption text-subdued">Buyer ID: {order.buyerId}</p>
        </div>

        <div>
          <p className="text-caption font-medium text-foreground">Shipment</p>
          {order.shipment ? (
            <div className="mt-1 flex flex-col gap-1 text-body-sm text-muted-foreground">
              <span>
                {order.shipment.carrier ?? "Carrier not yet assigned"}
                {order.shipment.trackingNumber ? ` · ${order.shipment.trackingNumber}` : ""}
              </span>
              <Badge variant="outline" className="w-fit capitalize">
                {order.shipment.status.replace("_", " ")}
              </Badge>
              <div className="flex flex-wrap gap-3">
                {order.shipment.trackingUrl ? (
                  <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
                    Track shipment
                  </a>
                ) : null}
                {order.shipment.labelUrl ? (
                  <a href={order.shipment.labelUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
                    Print label
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-1 text-body-sm text-muted-foreground">Not shipped yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function isStatusOption(value: string | null): value is (typeof STATUS_OPTIONS)[number] {
  return value !== null && (STATUS_OPTIONS as readonly string[]).includes(value);
}

function AdminOrdersView() {
  const searchParams = useSearchParams();
  const initialStatus = isStatusOption(searchParams.get("status")) ? (searchParams.get("status") as (typeof STATUS_OPTIONS)[number]) : "all";
  const [status, setStatus] = React.useState<(typeof STATUS_OPTIONS)[number]>(initialStatus);
  const [page, setPage] = React.useState(1);

  const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (status !== "all") query.set("status", status);

  const { data, loading, error, refresh } = useApiResource<{ items: AdminOrder[]; total: number }>(`/api/admin/orders?${query.toString()}`);
  const orders = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function changeStatus(next: (typeof STATUS_OPTIONS)[number]) {
    setStatus(next);
    setPage(1);
  }

  return (
    <>
      <Link href="/admin" className="focus-ring inline-flex items-center gap-2 text-body-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to admin overview
      </Link>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-2 font-display text-h2 text-foreground">Orders</h1>
          <p className="mt-1 text-body-sm text-muted-foreground">{total} order{total === 1 ? "" : "s"}{status !== "all" ? ` · ${status}` : ""}</p>
        </div>
        <select
          value={status}
          onChange={(event) => changeStatus(event.target.value as (typeof STATUS_OPTIONS)[number])}
          className="focus-ring h-10 rounded-md border border-border bg-surface px-3 text-body-sm capitalize text-foreground"
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All statuses" : option}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load orders"
            description={error}
            action={
              <Button variant="outline" onClick={refresh}>
                Retry
              </Button>
            }
          />
        ) : orders.length === 0 ? (
          <EmptyState icon={Package} title="No orders" description="Orders placed across the platform will show up here." />
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>

      {!loading && !error && totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-caption text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      ) : null}
    </>
  );
}

export default function AdminOrdersPage() {
  return (
    <PageContainer className="py-16">
      <RequireRole role="admin">
        <Suspense fallback={null}>
          <AdminOrdersView />
        </Suspense>
      </RequireRole>
    </PageContainer>
  );
}
