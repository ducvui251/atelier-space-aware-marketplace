"use client";

import * as React from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { IMAGE_UPLOAD_ALLOWED_MIME_TYPES } from "@atelier/contracts";
import type { Artwork } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ArtworkFormInput {
  title: string;
  medium: string;
  widthCm: number;
  heightCm: number;
  price: number;
  currency: string;
  dominantColors: string[];
  style: string[];
  orientation: Artwork["orientation"];
  editionType: Artwork["editionType"];
  year: number;
  imageUrl: string;
  coaUrl?: string;
  description?: string;
}

const artworkSchema = z.object({
  title: z.string().trim().min(1, "Required"),
  medium: z.string().trim().min(1, "Required"),
  widthCm: z.coerce.number().positive("Must be greater than 0"),
  heightCm: z.coerce.number().positive("Must be greater than 0"),
  price: z.coerce.number().positive("Must be greater than 0"),
  currency: z.string().trim().min(1, "Required"),
  dominantColors: z.string().trim().min(1, "Enter at least one color, separated by commas"),
  style: z.string().trim().min(1, "Enter at least one style, separated by commas"),
  orientation: z.enum(["portrait", "landscape", "square"]),
  editionType: z.enum(["original", "limited-edition"]),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  imageUrl: z.string().trim().url("Upload an image before saving"),
  coaUrl: z.string().trim().url("Invalid URL").optional().or(z.literal("")),
  description: z.string().trim().optional(),
});

type ArtworkFormInputValues = z.input<typeof artworkSchema>;
type ArtworkFormValues = z.output<typeof artworkSchema>;

interface ArtworkFormProps {
  initial?: Artwork;
  submitLabel: string;
  onSubmit: (input: ArtworkFormInput) => Promise<{ error: string } | { success: true; id?: string }>;
  onSuccess: () => void;
}

export function ArtworkForm({ initial, submitLabel, onSubmit, onSuccess }: ArtworkFormProps) {
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ArtworkFormInputValues, unknown, ArtworkFormValues>({
    resolver: zodResolver(artworkSchema),
    defaultValues: initial
      ? {
          title: initial.title,
          medium: initial.medium,
          widthCm: initial.widthCm,
          heightCm: initial.heightCm,
          price: initial.price,
          currency: initial.currency,
          dominantColors: initial.dominantColors.join(", "),
          style: initial.style.join(", "),
          orientation: initial.orientation,
          editionType: initial.editionType,
          year: initial.year,
          imageUrl: initial.imageUrl,
          coaUrl: initial.coaUrl ?? "",
          description: initial.description ?? "",
        }
      : {
          currency: "USD",
          orientation: "portrait",
          editionType: "original",
          year: new Date().getFullYear(),
        },
  });

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

  async function submit(values: ArtworkFormValues) {
    setFormError(null);
    setSubmitting(true);
    const input: ArtworkFormInput = {
      title: values.title,
      medium: values.medium,
      widthCm: values.widthCm,
      heightCm: values.heightCm,
      price: values.price,
      currency: values.currency,
      dominantColors: values.dominantColors.split(",").map((s) => s.trim()).filter(Boolean),
      style: values.style.split(",").map((s) => s.trim()).filter(Boolean),
      orientation: values.orientation,
      editionType: values.editionType,
      year: values.year,
      imageUrl: values.imageUrl,
      coaUrl: values.coaUrl || undefined,
      description: values.description || undefined,
    };
    try {
      const result = await onSubmit(input);
      if ("error" in result) {
        setFormError(result.error);
        return;
      }
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex max-w-2xl flex-col gap-4">
      {formError ? (
        <p
          role="alert"
          className="rounded-md border border-destructive bg-destructive-soft px-3 py-2 text-body-sm text-destructive-foreground"
        >
          {formError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title *" error={errors.title?.message}>
          <Input {...register("title")} className={cn(errors.title && "border-destructive")} />
        </Field>
        <Field label="Medium *" error={errors.medium?.message}>
          <Input {...register("medium")} className={cn(errors.medium && "border-destructive")} />
        </Field>
        <Field label="Width (cm) *" error={errors.widthCm?.message}>
          <Input type="number" step="1" {...register("widthCm")} className={cn(errors.widthCm && "border-destructive")} />
        </Field>
        <Field label="Height (cm) *" error={errors.heightCm?.message}>
          <Input type="number" step="1" {...register("heightCm")} className={cn(errors.heightCm && "border-destructive")} />
        </Field>
        <Field label="Price *" error={errors.price?.message}>
          <Input type="number" step="1" {...register("price")} className={cn(errors.price && "border-destructive")} />
        </Field>
        <Field label="Currency *" error={errors.currency?.message}>
          <Input {...register("currency")} className={cn(errors.currency && "border-destructive")} />
        </Field>
        <Field label="Year *" error={errors.year?.message}>
          <Input type="number" step="1" {...register("year")} className={cn(errors.year && "border-destructive")} />
        </Field>
        <Field label="Orientation *" error={errors.orientation?.message}>
          <select
            {...register("orientation")}
            className="focus-ring h-11 w-full rounded-md border border-border bg-surface px-4 text-body text-foreground"
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
            <option value="square">Square</option>
          </select>
        </Field>
        <Field label="Edition *" error={errors.editionType?.message}>
          <select
            {...register("editionType")}
            className="focus-ring h-11 w-full rounded-md border border-border bg-surface px-4 text-body text-foreground"
          >
            <option value="original">Original</option>
            <option value="limited-edition">Limited edition</option>
          </select>
        </Field>
      </div>

      <Field label="Dominant colors * (comma-separated)" error={errors.dominantColors?.message}>
        <Input
          {...register("dominantColors")}
          placeholder="Ivory, Warm Grey, Sand"
          className={cn(errors.dominantColors && "border-destructive")}
        />
      </Field>

      <Field label="Style * (comma-separated)" error={errors.style?.message}>
        <Input
          {...register("style")}
          placeholder="Abstract, Organic"
          className={cn(errors.style && "border-destructive")}
        />
      </Field>

      <Field label="Artwork image *" error={errors.imageUrl?.message ?? uploadError ?? undefined}>
        <div className="flex flex-col gap-2">
          <input
            type="file"
            accept={IMAGE_UPLOAD_ALLOWED_MIME_TYPES.join(",")}
            onChange={handleFileChange}
            disabled={uploading}
            className="text-body-sm text-foreground"
          />
          {uploading ? <p className="text-caption text-muted-foreground">Uploading…</p> : null}
          {watch("imageUrl") ? (
            <div className="relative h-32 w-32 overflow-hidden rounded-md border border-border">
              <Image src={watch("imageUrl")} alt="Preview" fill sizes="128px" className="object-cover" />
            </div>
          ) : null}
          <input type="hidden" {...register("imageUrl")} />
        </div>
      </Field>

      <Field label="Certificate of Authenticity URL (optional)" error={errors.coaUrl?.message}>
        <Input {...register("coaUrl")} placeholder="https://…" />
      </Field>

      <Field label="Description (optional)" error={errors.description?.message}>
        <textarea
          {...register("description")}
          rows={4}
          className="focus-ring w-full rounded-md border border-border bg-surface px-4 py-2.5 text-body text-foreground"
        />
      </Field>

      <Button type="submit" className="mt-2 w-fit" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
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
