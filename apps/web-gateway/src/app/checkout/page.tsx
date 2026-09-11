"use client";

import * as React from "react";
import Link from "next/link";
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
import { ArtworkImage } from "@/components/artwork/ArtworkImage";
import { cn, formatPrice } from "@/lib/utils";
import { useAuth, useCart } from "@/lib/client/hooks";
import { apiFetch, ApiError } from "@/lib/client/api";

const checkoutSchema = z.object({
  fullName: z.string().trim().min(1, "Required"),
  address: z.string().trim().min(1, "Required"),
  city: z.string().trim().min(1, "Required"),
  phone: z.string().trim().min(1, "Required"),
  method: z.enum(["card", "wallet"]),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

function CheckoutView() {
  const router = useRouter();
  const { items, total, refresh: refreshCart } = useCart();
  const { currentUser } = useAuth();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
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
    },
  });

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your cart is empty"
        description="Add an artwork to your cart before checking out."
        action={
          <Button asChild variant="outline">
            <Link href="/artworks">Browse artworks</Link>
          </Button>
        }
      />
    );
  }

  async function onSubmit(values: CheckoutFormValues) {
    setFormError(null);
    setUnavailableIds([]);
    setSubmitting(true);
    try {
      const result = await apiFetch<{ checkoutUrl?: string }>("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          shippingAddress: {
            fullName: values.fullName,
            address: values.address,
            city: values.city,
            phone: values.phone,
          },
          method: values.method,
        }),
      });
      await refreshCart();
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      router.push("/orders?success=1");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Checkout failed. Please try again.";
      setFormError(message);
      if (error instanceof ApiError && error.status === 409) setUnavailableIds(items.map((item) => item.id));
    } finally {
      setSubmitting(false);
    }
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
                Back to cart to see alternatives
              </Link>
            ) : null}
          </div>
        ) : null}

        <p className="eyebrow">Shipping address</p>
        <Field label="Full name" error={errors.fullName?.message}>
          <Input {...register("fullName")} className={cn(errors.fullName && "border-destructive")} />
        </Field>
        <Field label="Address" error={errors.address?.message}>
          <Input {...register("address")} className={cn(errors.address && "border-destructive")} />
        </Field>
        <Field label="City" error={errors.city?.message}>
          <Input {...register("city")} className={cn(errors.city && "border-destructive")} />
        </Field>
        <Field label="Phone number" error={errors.phone?.message}>
          <Input {...register("phone")} className={cn(errors.phone && "border-destructive")} />
        </Field>

        <p className="eyebrow mt-4">Payment</p>
        <Field label="Method" error={errors.method?.message}>
          <select
            {...register("method")}
            className="focus-ring h-11 w-full rounded-md border border-border bg-surface px-4 text-body text-foreground"
          >
            <option value="card">Credit / debit card</option>
            <option value="wallet">E-wallet</option>
          </select>
        </Field>

        <Button type="submit" size="lg" className="mt-4 w-fit" disabled={submitting}>
          {submitting ? "Processing…" : `Place order — ${formatPrice(total, items[0]?.currency ?? "USD")}`}
        </Button>
      </form>

      <aside className="h-fit rounded-lg border border-border bg-surface p-5">
        <p className="eyebrow mb-3">Your order</p>
        <div className="flex flex-col gap-3">
          {items.map((artwork) => (
            <div key={artwork.id} className="flex items-center gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                <ArtworkImage src={artwork.imageUrl} alt={artwork.title} fill sizes="56px" className="object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-body-sm text-foreground">{artwork.title}</p>
                <p className="text-caption text-muted-foreground">
                  {formatPrice(artwork.price, artwork.currency)}
                  {unavailableIds.includes(artwork.id) ? " · just sold out" : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-body font-medium text-foreground">
          <span>Total</span>
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
