"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/store/hooks";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export interface LoginFormProps {
  redirectTo?: string;
  className?: string;
}

export function LoginForm({ redirectTo = "/account", className }: LoginFormProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
  });

  async function handleSubmitValid(values: LoginFormValues) {
    setSubmitting(true);
    setAuthError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const result = login(values.email, values.password);
      if ("error" in result) {
        setAuthError(result.error);
        return;
      }
      router.push(redirectTo);
    } finally {
      setSubmitting(false);
    }
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

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-label text-foreground">
          Email
        </label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          disabled={submitting}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          className={cn(errors.email && "border-destructive")}
          {...register("email")}
        />
        {errors.email ? (
          <p
            id="login-email-error"
            role="alert"
            className="text-caption text-destructive"
          >
            {errors.email.message}
          </p>
        ) : null}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="text-label text-foreground">
            Password
          </label>
        </div>

        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={submitting}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "login-password-error" : undefined}
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
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>

        {errors.password ? (
          <p
            id="login-password-error"
            role="alert"
            className="text-caption text-destructive"
          >
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            <LogIn className="size-4" />
            Sign in
          </>
        )}
      </Button>
    </form>
  );
}
