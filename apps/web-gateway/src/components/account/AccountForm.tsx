"use client";

import * as React from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { IMAGE_UPLOAD_ALLOWED_MIME_TYPES } from "@atelier/contracts";
import { useAuth } from "@/lib/client/hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const accountSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  phone: z.string().trim().optional(),
  bio: z.string().trim().optional(),
  portfolioUrl: z
    .string()
    .trim()
    .url("Invalid URL")
    .optional()
    .or(z.literal("")),
  imageUrl: z.string().trim().optional(),
  originPostalCode: z.string().trim().optional(),
});

type AccountFormValues = z.infer<typeof accountSchema>;

export function AccountForm() {
  const { currentUser, currentArtist, updateProfile } = useAuth();
  const [savedMessage, setSavedMessage] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      fullName: currentUser?.fullName ?? "",
      phone: currentUser?.phone ?? "",
      bio: currentArtist?.bio ?? "",
      portfolioUrl: currentArtist?.portfolioUrl ?? "",
      imageUrl: currentArtist?.imageUrl ?? "",
      originPostalCode: currentArtist?.originPostalCode ?? "",
    },
  });

  if (!currentUser) return null;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads/image", { method: "POST", body });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setUploadError(typeof data?.error === "string" ? data.error : "Image upload failed");
        return;
      }
      setValue("imageUrl", data.url, { shouldValidate: true });
    } catch {
      setUploadError("Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: AccountFormValues) {
    setSavedMessage(null);
    setFormError(null);
    const result = await updateProfile({
      fullName: values.fullName,
      phone: values.phone,
      bio: values.bio,
      portfolioUrl: values.portfolioUrl,
      imageUrl: values.imageUrl,
      originPostalCode: values.originPostalCode,
    });
    if ("error" in result) {
      setFormError(result.error);
      return;
    }
    setSavedMessage("Profile changes saved.");
  }

  const avatar = currentArtist ? (
    <div className="order-first flex flex-col items-center gap-4 lg:order-none lg:h-full lg:justify-center">
      <div className="relative size-56 overflow-hidden rounded-full border border-border bg-muted shadow-sm sm:size-72 lg:size-96">
        {watch("imageUrl") ? (
          <Image
            src={watch("imageUrl")!}
            alt="Your avatar"
            fill
            sizes="(max-width: 640px) 224px, (max-width: 1024px) 288px, 384px"
            className="object-cover"
          />
        ) : null}
      </div>
      <label className="focus-ring cursor-pointer rounded-md border border-border bg-surface px-4 py-2 text-body-sm font-medium text-foreground transition-colors duration-normal hover:bg-muted">
        {uploading ? "Uploading…" : "Choose image"}
        <input
          type="file"
          accept={IMAGE_UPLOAD_ALLOWED_MIME_TYPES.join(",")}
          onChange={handleFileChange}
          disabled={uploading}
          className="sr-only"
        />
      </label>
      {uploadError ? <p className="text-caption text-destructive">{uploadError}</p> : null}
    </div>
  ) : null;

  return (
    <div className={cn("grid gap-10", avatar && "lg:grid-cols-2")}>
      <div>
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

          <Field label="Full name" error={errors.fullName?.message}>
            <Input {...register("fullName")} className={cn(errors.fullName && "border-destructive")} />
          </Field>

          <Field label="Phone number" error={errors.phone?.message}>
            <Input {...register("phone")} />
          </Field>

          {currentArtist ? (
            <>
              <Field label="Bio" error={errors.bio?.message}>
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
              <Field label="Shipping origin postal code" error={errors.originPostalCode?.message}>
                <Input
                  {...register("originPostalCode")}
                  placeholder="e.g. 100000"
                  className={cn(errors.originPostalCode && "border-destructive")}
                />
                <p className="text-caption text-muted-foreground">Used to calculate shipping cost from your location.</p>
              </Field>
            </>
          ) : null}

          <Button type="submit" className="mt-2 w-fit">
            Save changes
          </Button>
        </form>
      </div>

      {avatar}
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
