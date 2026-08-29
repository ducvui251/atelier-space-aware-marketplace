import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { LoginForm } from "@/components/auth/LoginForm";
import { signInWithPassword } from "./actions";

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
          <LoginForm onSubmit={signInWithPassword} />
        </div>
      </div>
    </PageContainer>
  );
}
