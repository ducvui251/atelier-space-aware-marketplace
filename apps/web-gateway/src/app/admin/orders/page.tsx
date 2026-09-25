"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertTriangle, ArrowLeft, Package, X } from "lucide-react";
import type { Artist, Order, Shipment } from "@atelier/contracts";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ArtworkImage } from "@/components/artwork/ArtworkImage";
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-caption font-medium text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-body-sm text-foreground">{children}</div>
    </div>
  );
}

function OrderDetailModal({
  order,
  artwork,
  open,
  onOpenChange,
}: {
  order: AdminOrder | null;
  artwork: Artwork | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: artist } = useApiResource<Artist>(artwork?.artistId ? `/api/artists/${encodeURIComponent(artwork.artistId)}` : null);
  if (!order) return null;
  const address = order.shippingAddress;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(94vw,680px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
          <DialogPrimitive.Close className="focus-ring absolute right-3 top-3 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <div className="flex items-start gap-4 pr-8">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
              <ArtworkImage src={artwork?.imageUrl ?? ""} alt={artwork?.title ?? ""} fill sizes="64px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate text-h3 font-medium text-foreground">
                {artwork?.title ?? order.artworkId}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-0.5 text-caption text-muted-foreground">
                Order {order.id} · {new Date(order.createdAt).toLocaleString("en-US")}
              </DialogPrimitive.Description>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-body-sm font-medium text-foreground">{formatPrice(order.totalAmount, order.currency)}</span>
                <Badge variant={statusVariant(order.status)} className="capitalize">
                  {order.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="eyebrow">Buyer</p>
              <div className="mt-3 flex flex-col gap-3">
                <Field label="Name">{address.fullName}</Field>
                <Field label="Shipping address">
                  {address.address}, {address.city}
                  {address.state ? `, ${address.state}` : ""} {address.postalCode ?? ""}
                  <br />
                  {address.country ?? ""}
                </Field>
                <Field label="Phone">{address.phone || "—"}</Field>
                <Field label="Buyer ID">
                  <span className="font-mono text-caption">{order.buyerId}</span>
                </Field>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="eyebrow">Seller</p>
              <div className="mt-3 flex flex-col gap-3">
                <Field label="Artist">
                  {artist ? (
                    <Link href={`/admin/artists?status=${artist.verificationStatus}`} className="underline underline-offset-2 hover:text-primary">
                      {artist.displayName}
                    </Link>
                  ) : (
                    artwork?.artist ?? "—"
                  )}
                </Field>
                <Field label="Location">{artist ? `${artist.location}${artist.nationality ? ` · ${artist.nationality}` : ""}` : "—"}</Field>
                <Field label="Verification">
                  {artist ? (
                    <Badge variant={artist.verificationStatus === "verified" ? "success" : artist.verificationStatus === "rejected" ? "destructive" : "warning"} className="capitalize">
                      {artist.verificationStatus}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Artist ID">
                  <span className="font-mono text-caption">{artwork?.artistId ?? "—"}</span>
                </Field>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
            <p className="eyebrow">Shipment</p>
            {order.shipment ? (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
                <Field label="Carrier">{order.shipment.carrier ?? "Not yet assigned"}</Field>
                <Field label="Tracking number">{order.shipment.trackingNumber ?? "—"}</Field>
                <Field label="Status">
                  <Badge variant="outline" className="w-fit capitalize">
                    {order.shipment.status.replace("_", " ")}
                  </Badge>
                </Field>
                <div className="flex items-end gap-3">
                  {order.shipment.trackingUrl ? (
                    <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="text-body-sm underline underline-offset-2 hover:text-primary">
                      Track shipment
                    </a>
                  ) : null}
                  {order.shipment.labelUrl ? (
                    <a href={order.shipment.labelUrl} target="_blank" rel="noreferrer" className="text-body-sm underline underline-offset-2 hover:text-primary">
                      Print label
                    </a>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-body-sm text-muted-foreground">Not shipped yet.</p>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function OrderRow({ order, onOpen }: { order: AdminOrder; onOpen: (order: AdminOrder, artwork: Artwork | null) => void }) {
  const { data: artwork } = useApiResource<Artwork>(`/api/artworks/${encodeURIComponent(order.artworkId)}`);
  const address = order.shippingAddress;

  return (
    <button
      type="button"
      onClick={() => onOpen(order, artwork)}
      className="focus-ring flex w-full items-center gap-4 rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:border-border-strong hover:bg-muted/40"
    >
      <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
        <ArtworkImage src={artwork?.imageUrl ?? ""} alt={artwork?.title ?? ""} fill sizes="56px" className="object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-medium text-foreground">{artwork?.title ?? order.artworkId}</p>
        <p className="mt-0.5 truncate text-caption text-muted-foreground">
          Order {order.id.slice(0, 8)} · {new Date(order.createdAt).toLocaleDateString("en-US")}
        </p>
      </div>

      <div className="hidden min-w-0 flex-1 sm:block">
        <p className="text-caption text-subdued">Buyer</p>
        <p className="truncate text-body-sm text-foreground">{address.fullName}</p>
      </div>

      <div className="hidden min-w-0 flex-1 md:block">
        <p className="text-caption text-subdued">Seller</p>
        <p className="truncate text-body-sm text-foreground">{artwork?.artist ?? "—"}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-body-sm font-medium text-foreground">{formatPrice(order.totalAmount, order.currency)}</span>
        <Badge variant={statusVariant(order.status)} className="capitalize">
          {order.status}
        </Badge>
      </div>
    </button>
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
  const [selected, setSelected] = React.useState<{ order: AdminOrder; artwork: Artwork | null } | null>(null);

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
          <p className="mt-1 text-body-sm text-muted-foreground">{total} order{total === 1 ? "" : "s"}{status !== "all" ? ` · ${status}` : ""} · click an order for full detail</p>
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
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
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
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} onOpen={(o, artwork) => setSelected({ order: o, artwork })} />
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

      <OrderDetailModal
        order={selected?.order ?? null}
        artwork={selected?.artwork}
        open={selected !== null}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
      />
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
