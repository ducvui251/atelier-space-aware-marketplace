"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShoppingBag } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import { useAppState, useCart } from "@/lib/store/hooks";

const checkoutSchema = z.object({
  fullName: z.string().trim().min(1, "Bắt buộc"),
  address: z.string().trim().min(1, "Bắt buộc"),
  city: z.string().trim().min(1, "Bắt buộc"),
  phone: z.string().trim().min(1, "Bắt buộc"),
  method: z.enum(["card", "wallet"]),
  simulateFailure: z.boolean(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

function CheckoutView() {
  const router = useRouter();
  const { items, total, cartArtworkIds } = useCart();
  const { checkout, currentUser } = useAppState();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [unavailableIds, setUnavailableIds] = React.useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: currentUser?.fullName ?? "",
      phone: currentUser?.phone ?? "",
      address: "",
      city: "",
      method: "card",
      simulateFailure: false,
    },
  });

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Giỏ hàng trống"
        description="Thêm tác phẩm vào giỏ trước khi checkout."
        action={
          <Button asChild variant="outline">
            <Link href="/artworks">Khám phá tác phẩm</Link>
          </Button>
        }
      />
    );
  }

  function onSubmit(values: CheckoutFormValues) {
    setFormError(null);
    setUnavailableIds([]);
    const result = checkout({
      artworkIds: cartArtworkIds,
      shippingAddress: {
        fullName: values.fullName,
        address: values.address,
        city: values.city,
        phone: values.phone,
      },
      method: values.method,
      simulateFailure: values.simulateFailure,
    });
    if (!result.success) {
      setFormError(result.error);
      if (result.unavailableArtworkIds) setUnavailableIds(result.unavailableArtworkIds);
      return;
    }
    router.push("/orders?success=1");
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {formError ? (
          <div
            role="alert"
            className="rounded-md border border-destructive bg-destructive-soft px-3 py-2 text-body-sm text-destructive-foreground"
          >
            <p>{formError}</p>
            {unavailableIds.length > 0 ? (
              <Link href="/cart" className="mt-1 inline-block underline underline-offset-2">
                Quay lại giỏ hàng để xem tác phẩm thay thế
              </Link>
            ) : null}
          </div>
        ) : null}

        <p className="eyebrow">Địa chỉ giao hàng</p>
        <Field label="Họ và tên" error={errors.fullName?.message}>
          <Input {...register("fullName")} className={cn(errors.fullName && "border-destructive")} />
        </Field>
        <Field label="Địa chỉ" error={errors.address?.message}>
          <Input {...register("address")} className={cn(errors.address && "border-destructive")} />
        </Field>
        <Field label="Thành phố" error={errors.city?.message}>
          <Input {...register("city")} className={cn(errors.city && "border-destructive")} />
        </Field>
        <Field label="Số điện thoại" error={errors.phone?.message}>
          <Input {...register("phone")} className={cn(errors.phone && "border-destructive")} />
        </Field>

        <p className="eyebrow mt-4">Thanh toán</p>
        <Field label="Phương thức" error={errors.method?.message}>
          <select
            {...register("method")}
            className="focus-ring h-11 w-full rounded-md border border-border bg-surface px-4 text-body text-foreground"
          >
            <option value="card">Thẻ tín dụng / ghi nợ</option>
            <option value="wallet">Ví điện tử</option>
          </select>
        </Field>

        <label className="mt-1 flex items-center gap-2 text-body-sm text-muted-foreground">
          <input type="checkbox" {...register("simulateFailure")} className="size-4" />
          Giả lập thanh toán thất bại (demo luồng ngoại lệ)
        </label>

        <Button type="submit" size="lg" className="mt-4 w-fit">
          Đặt hàng — {formatPrice(total, items[0]?.currency ?? "USD")}
        </Button>
      </form>

      <aside className="h-fit rounded-lg border border-border bg-surface p-5">
        <p className="eyebrow mb-3">Đơn hàng của bạn</p>
        <div className="flex flex-col gap-3">
          {items.map((artwork) => (
            <div key={artwork.id} className="flex items-center gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image src={artwork.imageUrl} alt={artwork.title} fill sizes="56px" className="object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-body-sm text-foreground">{artwork.title}</p>
                <p className="text-caption text-muted-foreground">
                  {formatPrice(artwork.price, artwork.currency)}
                  {unavailableIds.includes(artwork.id) ? " · vừa hết hàng" : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-body font-medium text-foreground">
          <span>Tổng cộng</span>
          <span>{formatPrice(total, items[0]?.currency ?? "USD")}</span>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-label text-foreground">{label}</label>
      {children}
      {error ? (
        <p role="alert" className="text-caption text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <PageContainer className="py-10">
      <p className="eyebrow">Checkout</p>
      <h1 className="mt-2 font-display text-h1 text-foreground">Checkout</h1>
      <div className="mt-8">
        <RequireRole role={["buyer", "artist", "admin"]}>
          <CheckoutView />
        </RequireRole>
      </div>
    </PageContainer>
  );
}
