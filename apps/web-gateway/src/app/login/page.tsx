import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Atelier account.",
};

export default function LoginPage() {
  return (
    <PageContainer className="py-16">
      <div className="mx-auto w-full max-w-md">
        <p className="eyebrow">Welcome back</p>
        <h1 className="mt-2 font-display text-h2 text-foreground">Sign in</h1>
        <p className="mt-3 text-body text-muted-foreground">
          Enter your email and password to continue.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
        <p className="mt-6 text-body-sm text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-medium text-foreground underline underline-offset-2">
            Đăng ký
          </Link>
        </p>

        <p className="mt-6 text-body-sm text-muted-foreground">
          New to Atelier?{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>
    </PageContainer>
  );
}
