"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, X } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/lib/store/hooks";

function CartView() {
  const { items, total, removeFromCart } = useCart();

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Giỏ hàng trống"
        description="Thêm tác phẩm vào giỏ để tiếp tục checkout."
        action={
          <Button asChild variant="outline">
            <Link href="/artworks">Khám phá tác phẩm</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        {items.map((artwork) => (
          <div key={artwork.id} className="flex gap-4 rounded-lg border border-border bg-surface p-4">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-muted">
              <Image src={artwork.imageUrl} alt={artwork.title} fill sizes="96px" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <Link
                  href={`/artworks/${artwork.id}`}
                  className="focus-ring font-display text-h3 text-foreground hover:underline"
                >
                  {artwork.title}
                </Link>
                <p className="text-body-sm text-muted-foreground">{artwork.artist}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body font-medium text-foreground">
                  {formatPrice(artwork.price, artwork.currency)}
                </span>
                <button
                  type="button"
                  aria-label="Remove from cart"
                  onClick={() => removeFromCart(artwork.id)}
                  className="focus-ring flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside className="h-fit rounded-lg border border-border bg-surface p-5">
        <p className="eyebrow mb-3">Tóm tắt đơn hàng</p>
        <div className="flex items-center justify-between text-body">
          <span className="text-muted-foreground">Tạm tính</span>
          <span className="font-medium text-foreground">
            {formatPrice(total, items[0]?.currency ?? "USD")}
          </span>
        </div>
        <Button asChild size="lg" className="mt-5 w-full">
          <Link href="/checkout">Tiến hành thanh toán</Link>
        </Button>
      </aside>
    </div>
  );
}

export default function CartPage() {
  return (
    <PageContainer className="py-10">
      <p className="eyebrow">Giỏ hàng</p>
      <h1 className="mt-2 font-display text-h1 text-foreground">Cart</h1>
      <div className="mt-8">
        <RequireRole role={["buyer", "artist", "admin"]}>
          <CartView />
        </RequireRole>
      </div>
    </PageContainer>
  );
}
