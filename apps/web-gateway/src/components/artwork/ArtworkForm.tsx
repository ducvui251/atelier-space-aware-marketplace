"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Artwork } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ArtworkFormInput } from "@/lib/store/AppProvider";

const artworkSchema = z.object({
  title: z.string().trim().min(1, "Bắt buộc"),
  medium: z.string().trim().min(1, "Bắt buộc"),
  widthCm: z.coerce.number().positive("Phải lớn hơn 0"),
  heightCm: z.coerce.number().positive("Phải lớn hơn 0"),
  price: z.coerce.number().positive("Phải lớn hơn 0"),
  currency: z.string().trim().min(1, "Bắt buộc"),
  dominantColors: z.string().trim().min(1, "Nhập ít nhất một màu, cách nhau bởi dấu phẩy"),
  style: z.string().trim().min(1, "Nhập ít nhất một phong cách, cách nhau bởi dấu phẩy"),
  orientation: z.enum(["portrait", "landscape", "square"]),
  editionType: z.enum(["original", "limited-edition"]),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  imageUrl: z.string().trim().url("URL ảnh không hợp lệ"),
  coaUrl: z.string().trim().url("URL không hợp lệ").optional().or(z.literal("")),
  description: z.string().trim().optional(),
});

type ArtworkFormInputValues = z.input<typeof artworkSchema>;
type ArtworkFormValues = z.output<typeof artworkSchema>;

interface ArtworkFormProps {
  initial?: Artwork;
  submitLabel: string;
  onSubmit: (input: ArtworkFormInput) => { error: string } | { success: true; id?: string };
  onSuccess: () => void;
}

export function ArtworkForm({ initial, submitLabel, onSubmit, onSuccess }: ArtworkFormProps) {
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
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

  function submit(values: ArtworkFormValues) {
    setFormError(null);
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
    const result = onSubmit(input);
    if ("error" in result) {
      setFormError(result.error);
      return;
    }
    onSuccess();
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
        <Field label="Tên tác phẩm *" error={errors.title?.message}>
          <Input {...register("title")} className={cn(errors.title && "border-destructive")} />
        </Field>
        <Field label="Chất liệu *" error={errors.medium?.message}>
          <Input {...register("medium")} className={cn(errors.medium && "border-destructive")} />
        </Field>
        <Field label="Chiều rộng (cm) *" error={errors.widthCm?.message}>
          <Input type="number" step="1" {...register("widthCm")} className={cn(errors.widthCm && "border-destructive")} />
        </Field>
        <Field label="Chiều cao (cm) *" error={errors.heightCm?.message}>
          <Input type="number" step="1" {...register("heightCm")} className={cn(errors.heightCm && "border-destructive")} />
        </Field>
        <Field label="Giá *" error={errors.price?.message}>
          <Input type="number" step="1" {...register("price")} className={cn(errors.price && "border-destructive")} />
        </Field>
        <Field label="Tiền tệ *" error={errors.currency?.message}>
          <Input {...register("currency")} className={cn(errors.currency && "border-destructive")} />
        </Field>
        <Field label="Năm sáng tác *" error={errors.year?.message}>
          <Input type="number" step="1" {...register("year")} className={cn(errors.year && "border-destructive")} />
        </Field>
        <Field label="Hướng tranh *" error={errors.orientation?.message}>
          <select
            {...register("orientation")}
            className="focus-ring h-11 w-full rounded-md border border-border bg-surface px-4 text-body text-foreground"
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
            <option value="square">Square</option>
          </select>
        </Field>
        <Field label="Loại bản *" error={errors.editionType?.message}>
          <select
            {...register("editionType")}
            className="focus-ring h-11 w-full rounded-md border border-border bg-surface px-4 text-body text-foreground"
          >
            <option value="original">Original</option>
            <option value="limited-edition">Limited edition</option>
          </select>
        </Field>
      </div>

      <Field label="Màu chủ đạo * (cách nhau bởi dấu phẩy)" error={errors.dominantColors?.message}>
        <Input
          {...register("dominantColors")}
          placeholder="Ivory, Warm Grey, Sand"
          className={cn(errors.dominantColors && "border-destructive")}
        />
      </Field>

      <Field label="Phong cách * (cách nhau bởi dấu phẩy)" error={errors.style?.message}>
        <Input
          {...register("style")}
          placeholder="Abstract, Organic"
          className={cn(errors.style && "border-destructive")}
        />
      </Field>

      <Field label="URL ảnh tác phẩm *" error={errors.imageUrl?.message}>
        <Input
          {...register("imageUrl")}
          placeholder="https://…"
          className={cn(errors.imageUrl && "border-destructive")}
        />
      </Field>

      <Field label="URL Certificate of Authenticity (tuỳ chọn)" error={errors.coaUrl?.message}>
        <Input {...register("coaUrl")} placeholder="https://…" />
      </Field>

      <Field label="Mô tả (tuỳ chọn)" error={errors.description?.message}>
        <textarea
          {...register("description")}
          rows={4}
          className="focus-ring w-full rounded-md border border-border bg-surface px-4 py-2.5 text-body text-foreground"
        />
      </Field>

      <Button type="submit" className="mt-2 w-fit">
        {submitLabel}
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
