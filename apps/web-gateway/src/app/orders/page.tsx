"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PackageOpen, Star } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import { useAppState, ordersForBuyer } from "@/lib/store/hooks";
import type { Order } from "@/types";

function ReviewForm({ orderId }: { orderId: string }) {
  const { submitReview } = useAppState();
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  if (submitted) {
    return <p className="text-caption text-success-foreground">Cảm ơn bạn đã đánh giá!</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} sao`}
            onClick={() => setRating(value)}
            className="focus-ring"
          >
            <Star
              className={cn(
                "size-5",
                value <= rating ? "fill-warning text-warning" : "text-border-strong",
              )}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Nhận xét của bạn (tuỳ chọn)"
        className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm text-foreground"
      />
      <Button
        size="sm"
        className="w-fit"
        onClick={() => {
          submitReview(orderId, rating, comment || undefined);
          setSubmitted(true);
        }}
      >
        Gửi đánh giá
      </Button>
    </div>
  );
}

function ComplaintForm({ orderId }: { orderId: string }) {
  const { fileComplaint } = useAppState();
  const [reason, setReason] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  if (submitted) {
    return <p className="text-caption text-warning-foreground">Đã gửi báo cáo sự cố, đội ngũ hỗ trợ sẽ liên hệ.</p>;
  }

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Báo sự cố
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Mô tả sự cố (trễ, thất lạc, hư hỏng…)"
        className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm text-foreground"
      />
      <Button
        size="sm"
        variant="outline"
        className="w-fit"
        disabled={!reason.trim()}
        onClick={() => {
          fileComplaint(orderId, reason.trim());
          setSubmitted(true);
        }}
      >
        Gửi báo cáo
      </Button>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const { db, confirmReceived } = useAppState();
  const artwork = db.artworks.find((a) => a.id === order.artworkId);
  const shipment = db.shipments.find((s) => s.orderId === order.id);
  const review = db.reviews.find((r) => r.orderId === order.id);
  const complaint = db.complaints.find((c) => c.orderId === order.id);

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

      {shipment ? (
        <p className="mt-3 text-body-sm text-muted-foreground">
          Vận chuyển: {shipment.carrier ?? "—"} · {shipment.trackingNumber ?? "—"} ·{" "}
          <span className="capitalize">{shipment.status.replace("_", " ")}</span>
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {order.status === "shipped" ? (
          <Button size="sm" onClick={() => confirmReceived(order.id)}>
            Đã nhận hàng
          </Button>
        ) : null}
        {(order.status === "shipped" || order.status === "completed") && !complaint ? (
          <ComplaintForm orderId={order.id} />
        ) : null}
        {complaint ? (
          <span className="text-caption text-muted-foreground">
            Khiếu nại: <span className="capitalize">{complaint.status}</span>
          </span>
        ) : null}
      </div>

      {order.status === "completed" ? (
        <div className="mt-4 border-t border-border pt-4">
          {review ? (
            <p className="text-caption text-muted-foreground">
              Bạn đã đánh giá {review.rating}/5 {review.comment ? `— "${review.comment}"` : ""}
            </p>
          ) : (
            <ReviewForm orderId={order.id} />
          )}
        </div>
      ) : null}
    </div>
  );
}

function OrdersView() {
  const { db, currentUser } = useAppState();
  const searchParams = useSearchParams();
  const justPlaced = searchParams.get("success") === "1";
  if (!currentUser) return null;
  const orders = ordersForBuyer(db, currentUser.id);

  return (
    <>
      {justPlaced ? (
        <p
          role="status"
          className="mb-6 rounded-md border border-success bg-success-soft px-3 py-2 text-body-sm text-success-foreground"
        >
          Đặt hàng thành công! Nghệ sĩ đã được thông báo.
        </p>
      ) : null}

      {orders.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="Chưa có đơn hàng"
          description="Đơn hàng của bạn sẽ hiện ở đây sau khi checkout."
          action={
            <Button asChild variant="outline">
              <Link href="/artworks">Khám phá tác phẩm</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </>
  );
}

export default function OrdersPage() {
  return (
    <PageContainer className="py-10">
      <p className="eyebrow">Your orders</p>
      <h1 className="mt-2 font-display text-h1 text-foreground">Orders</h1>
      <div className="mt-8">
        <RequireRole role={["buyer", "artist", "admin"]}>
          <Suspense fallback={null}>
            <OrdersView />
          </Suspense>
        </RequireRole>
      </div>
    </PageContainer>
  );
}
