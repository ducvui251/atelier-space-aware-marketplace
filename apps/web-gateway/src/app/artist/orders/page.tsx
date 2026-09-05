"use client";

import * as React from "react";
import { PackageOpen } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPrice } from "@/lib/utils";
import { useAppState, ordersForArtist } from "@/lib/store/hooks";

function ShipForm({ orderId }: { orderId: string }) {
  const { markShipped } = useAppState();
  const [carrier, setCarrier] = React.useState("");
  const [tracking, setTracking] = React.useState("");

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
      <Button
        size="sm"
        disabled={!carrier.trim() || !tracking.trim()}
        onClick={() => markShipped(orderId, carrier.trim(), tracking.trim())}
      >
        Đánh dấu đã gửi
      </Button>
    </div>
  );
}

function ArtistOrdersView() {
  const { db, currentArtist } = useAppState();
  if (!currentArtist) return null;
  const orders = ordersForArtist(db, currentArtist.id);

  return (
    <>
      <p className="eyebrow">Artist dashboard</p>
      <h1 className="mt-2 font-display text-h2 text-foreground">Đơn hàng của bạn</h1>

      {orders.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={PackageOpen}
            title="Chưa có đơn hàng"
            description="Đơn hàng cho tác phẩm của bạn sẽ hiện ở đây."
          />
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-4">
          {orders.map((order) => {
            const artwork = db.artworks.find((a) => a.id === order.artworkId);
            const shipment = db.shipments.find((s) => s.orderId === order.id);
            return (
              <div key={order.id} className="rounded-lg border border-border bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-body font-medium text-foreground">
                      {artwork?.title ?? order.artworkId}
                    </p>
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
                  Giao tới: {order.shippingAddress.fullName}, {order.shippingAddress.address},{" "}
                  {order.shippingAddress.city}
                </p>
                {shipment ? (
                  <p className="mt-2 text-caption text-muted-foreground">
                    Vận chuyển: {shipment.carrier} · {shipment.trackingNumber} · {shipment.status}
                  </p>
                ) : null}
                {order.status === "paid" ? (
                  <div className="mt-4">
                    <ShipForm orderId={order.id} />
                  </div>
                ) : null}
              </div>
            );
          })}
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
