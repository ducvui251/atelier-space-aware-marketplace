"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/client/hooks";

const registerSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export interface RegisterFormProps {
  redirectTo?: string;
  className?: string;
}

export function RegisterForm({ redirectTo = "/account", className }: RegisterFormProps) {
  const router = useRouter();
  const { register: registerAccount } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [confirmationNeeded, setConfirmationNeeded] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
  });

  async function handleSubmitValid(values: RegisterFormValues) {
    setSubmitting(true);
    setAuthError(null);
    setConfirmationNeeded(false);
    try {
      const result = await registerAccount(values.email, values.password, values.fullName);
      if ("error" in result) {
        setAuthError(result.error);
        return;
      }
      if ("requiresEmailConfirmation" in result) {
        setConfirmationNeeded(true);
        return;
      }
      router.push(redirectTo);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmationNeeded) {
    return (
      <p role="status" className="rounded-md border border-border-strong bg-surface px-3 py-3 text-body-sm text-foreground">
        Đã tạo tài khoản. Vui lòng kiểm tra email để xác nhận trước khi đăng nhập.
      </p>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(handleSubmitValid)}
      className={cn("flex flex-col gap-4", className)}
    >
      {authError ? (
        <p
          role="alert"
          className="rounded-md border border-destructive bg-destructive-soft px-3 py-2 text-body-sm text-destructive-foreground"
        >
          {authError}
        </p>
      ) : null}

      {/* Full name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-full-name" className="text-label text-foreground">
          Họ và tên
        </label>
        <Input
          id="register-full-name"
          type="text"
          autoComplete="name"
          placeholder="Nguyễn Văn A"
          disabled={submitting}
          aria-invalid={errors.fullName ? true : undefined}
          aria-describedby={errors.fullName ? "register-full-name-error" : undefined}
          className={cn(errors.fullName && "border-destructive")}
          {...register("fullName")}
        />
        {errors.fullName ? (
          <p id="register-full-name-error" role="alert" className="text-caption text-destructive">
            {errors.fullName.message}
          </p>
        ) : null}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-email" className="text-label text-foreground">
          Email
        </label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          disabled={submitting}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "register-email-error" : undefined}
          className={cn(errors.email && "border-destructive")}
          {...register("email")}
        />
        {errors.email ? (
          <p id="register-email-error" role="alert" className="text-caption text-destructive">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-password" className="text-label text-foreground">
          Mật khẩu
        </label>
        <div className="relative">
          <Input
            id="register-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={submitting}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "register-password-error" : undefined}
            className={cn("pr-12", errors.password && "border-destructive")}
            {...register("password")}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            disabled={submitting}
            onClick={() => setShowPassword((value) => !value)}
            className="focus-ring absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-subdued transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.password ? (
          <p id="register-password-error" role="alert" className="text-caption text-destructive">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Đang tạo tài khoản…
          </>
        ) : (
          <>
            <UserPlus className="size-4" />
            Đăng ký
          </>
        )}
      </Button>
    </form>
  );
}
