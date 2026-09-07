"use client";

import * as React from "react";
import { AlertTriangle, PackageOpen } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import { useApiResource } from "@/lib/client/hooks";
import { apiFetch } from "@/lib/client/api";
import type { Artwork, Order, Shipment } from "@/types";

type ArtistOrder = Order & { shipment: Shipment | null };

function ShipForm({ orderId, onShipped }: { orderId: string; onShipped: () => void }) {
  const [carrier, setCarrier] = React.useState("");
  const [tracking, setTracking] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      await apiFetch(`/api/artist/orders/${encodeURIComponent(orderId)}/ship`, {
        method: "POST",
        body: JSON.stringify({ carrier: carrier.trim(), trackingNumber: tracking.trim() }),
      });
      onShipped();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Đơn vị vận chuyển"
        value={carrier}
        onChange={(e) => setCarrier(e.target.value)}
        className="h-9 w-40"
      />
      <Input
        placeholder="Mã tracking"
        value={tracking}
        onChange={(e) => setTracking(e.target.value)}
        className="h-9 w-40"
      />
      <Button size="sm" disabled={!carrier.trim() || !tracking.trim() || submitting} onClick={submit}>
        Đánh dấu đã gửi
      </Button>
    </div>
  );
}

function ArtistOrderRow({ order, onChanged }: { order: ArtistOrder; onChanged: () => void }) {
  const { data: artwork } = useApiResource<Artwork>(`/api/artworks/${encodeURIComponent(order.artworkId)}`);

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-body font-medium text-foreground">{artwork?.title ?? order.artworkId}</p>
          <p className="text-caption text-muted-foreground">
            {formatPrice(order.totalAmount, order.currency)} ·{" "}
            {new Date(order.createdAt).toLocaleDateString("vi-VN")}
          </p>
        </div>
        <Badge variant="outline" className="capitalize">
          {order.status}
        </Badge>
      </div>
      <p className="mt-3 text-body-sm text-muted-foreground">
        Giao tới: {order.shippingAddress.fullName}, {order.shippingAddress.address}, {order.shippingAddress.city}
      </p>
      {order.shipment ? (
        <p className="mt-2 text-caption text-muted-foreground">
          Vận chuyển: {order.shipment.carrier} · {order.shipment.trackingNumber} · {order.shipment.status}
        </p>
      ) : null}
      {order.status === "paid" ? (
        <div className="mt-4">
          <ShipForm orderId={order.id} onShipped={onChanged} />
        </div>
      ) : null}
    </div>
  );
}

function ArtistOrdersView() {
  const { data, loading, error, refresh } = useApiResource<{ items: ArtistOrder[]; total: number }>("/api/artist/orders");
  const orders = data?.items ?? [];

  return (
    <>
      <p className="eyebrow">Artist dashboard</p>
      <h1 className="mt-2 font-display text-h2 text-foreground">Đơn hàng của bạn</h1>

      {loading ? (
        <div className="mt-10 flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-10">
          <EmptyState
            icon={AlertTriangle}
            title="Không thể tải đơn hàng"
            description={error}
            action={
              <Button variant="outline" onClick={refresh}>
                Thử lại
              </Button>
            }
          />
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={PackageOpen}
            title="Chưa có đơn hàng"
            description="Đơn hàng cho tác phẩm của bạn sẽ hiện ở đây."
          />
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-4">
          {orders.map((order) => (
            <ArtistOrderRow key={order.id} order={order} onChanged={refresh} />
          ))}
        </div>
      )}
    </>
  );
}

export default function ArtistOrdersPage() {
  return (
    <PageContainer className="py-16">
      <RequireRole role="artist">
        <ArtistOrdersView />
      </RequireRole>
    </PageContainer>
  );
}
