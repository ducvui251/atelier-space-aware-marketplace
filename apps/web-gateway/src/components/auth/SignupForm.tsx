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

const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["buyer", "artist"]),
});

export type SignupFormValues = z.infer<typeof signupSchema>;

interface SignupResponse {
  user: unknown;
  requiresEmailConfirmation: boolean;
}

export function SignupForm({ redirectTo = "/account", className }: { redirectTo?: string; className?: string }) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [confirmNotice, setConfirmNotice] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onTouched",
    defaultValues: { role: "buyer" },
  });

  async function handleSubmitValid(values: SignupFormValues) {
    setSubmitting(true);
    setAuthError(null);
    try {
      const result = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!result.ok) {
        const body = (await result.json().catch(() => null)) as { error?: string } | null;
        setAuthError(body?.error ?? "Could not create the account.");
        return;
      }
      const body = (await result.json()) as SignupResponse;
      if (body.requiresEmailConfirmation) {
        setConfirmNotice("Account created. Check your email to confirm the address, then sign in.");
        return;
      }
      await refreshUser();
      router.push(redirectTo);
    } catch {
      setAuthError("Signup service unavailable. Please try again.");
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
      {confirmNotice ? (
        <p
          role="status"
          className="rounded-md border border-border bg-surface px-3 py-2 text-body-sm text-foreground"
        >
          {confirmNotice}
        </p>
      ) : null}

      {/* Role */}
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-label text-foreground">I want to</legend>
        <div className="flex gap-2">
          <label className="focus-ring flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-body-sm has-[:checked]:border-primary">
            <input type="radio" value="buyer" className="accent-primary" disabled={submitting} {...register("role")} />
            Buy art
          </label>
          <label className="focus-ring flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-body-sm has-[:checked]:border-primary">
            <input type="radio" value="artist" className="accent-primary" disabled={submitting} {...register("role")} />
            Sell art
          </label>
        </div>
      </fieldset>

      {/* Full name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-name" className="text-label text-foreground">
          Full name
        </label>
        <Input
          id="signup-name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          disabled={submitting}
          aria-invalid={errors.fullName ? true : undefined}
          aria-describedby={errors.fullName ? "signup-name-error" : undefined}
          className={cn(errors.fullName && "border-destructive")}
          {...register("fullName")}
        />
        {errors.fullName ? (
          <p
            id="signup-name-error"
            role="alert"
            className="text-caption text-destructive"
          >
            {errors.fullName.message}
          </p>
        ) : null}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-email" className="text-label text-foreground">
          Email
        </label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          disabled={submitting}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "signup-email-error" : undefined}
          className={cn(errors.email && "border-destructive")}
          {...register("email")}
        />
        {errors.email ? (
          <p
            id="signup-email-error"
            role="alert"
            className="text-caption text-destructive"
          >
            {errors.email.message}
          </p>
        ) : null}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-password" className="text-label text-foreground">
          Password
        </label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={submitting}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "signup-password-error" : undefined}
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
            id="signup-password-error"
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
            Creating account…
          </>
        ) : (
          <>
            <UserPlus className="size-4" />
            Create account
          </>
        )}
      </Button>
    </form>
  );
}
