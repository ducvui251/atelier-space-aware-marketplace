"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/store/hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const accountSchema = z.object({
  fullName: z.string().trim().min(1, "Họ tên không được để trống"),
  phone: z.string().trim().optional(),
  bio: z.string().trim().optional(),
  portfolioUrl: z
    .string()
    .trim()
    .url("Đường dẫn không hợp lệ")
    .optional()
    .or(z.literal("")),
});

type AccountFormValues = z.infer<typeof accountSchema>;

export function AccountForm() {
  const { currentUser, currentArtist, updateProfile } = useAuth();
  const [savedMessage, setSavedMessage] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      fullName: currentUser?.fullName ?? "",
      phone: currentUser?.phone ?? "",
      bio: currentArtist?.bio ?? "",
      portfolioUrl: currentArtist?.portfolioUrl ?? "",
    },
  });

  if (!currentUser) return null;

  function onSubmit(values: AccountFormValues) {
    setSavedMessage(null);
    setFormError(null);
    const result = updateProfile({
      fullName: values.fullName,
      phone: values.phone,
      bio: values.bio,
      portfolioUrl: values.portfolioUrl,
    });
    if ("error" in result) {
      setFormError(result.error);
      return;
    }
    setSavedMessage("Đã lưu thay đổi hồ sơ.");
  }

  return (
    <>
      <p className="eyebrow">Account</p>
      <h1 className="mt-2 font-display text-h2 text-foreground">Your account</h1>
      <div className="mt-3 flex items-center gap-2">
        <Badge variant="outline" className="capitalize">
          {currentUser.role}
        </Badge>
        <span className="text-body-sm text-muted-foreground">{currentUser.email}</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex max-w-lg flex-col gap-4">
        {formError ? (
          <p
            role="alert"
            className="rounded-md border border-destructive bg-destructive-soft px-3 py-2 text-body-sm text-destructive-foreground"
          >
            {formError}
          </p>
        ) : null}
        {savedMessage ? (
          <p
            role="status"
            className="rounded-md border border-success bg-success-soft px-3 py-2 text-body-sm text-success-foreground"
          >
            {savedMessage}
          </p>
        ) : null}

        <Field label="Họ và tên" error={errors.fullName?.message}>
          <Input {...register("fullName")} className={cn(errors.fullName && "border-destructive")} />
        </Field>

        <Field label="Số điện thoại" error={errors.phone?.message}>
          <Input {...register("phone")} />
        </Field>

        {currentArtist ? (
          <>
            <Field label="Giới thiệu (bio)" error={errors.bio?.message}>
              <textarea
                {...register("bio")}
                rows={4}
                className="focus-ring w-full rounded-md border border-border bg-surface px-4 py-2.5 text-body text-foreground"
              />
            </Field>
            <Field label="Portfolio URL" error={errors.portfolioUrl?.message}>
              <Input
                {...register("portfolioUrl")}
                placeholder="https://…"
                className={cn(errors.portfolioUrl && "border-destructive")}
              />
            </Field>
          </>
        ) : null}

        <Button type="submit" className="mt-2 w-fit">
          Lưu thay đổi
        </Button>
      </form>
    </>
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
