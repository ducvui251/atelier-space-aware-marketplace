import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Atelier account.",
};

const DEMO_ACCOUNTS = [
  { role: "Buyer", email: "buyer1@atelier.test", password: "buyer123" },
  { role: "Artist (verified)", email: "artist1@atelier.test", password: "artist123" },
  { role: "Artist (pending)", email: "artist2@atelier.test", password: "artist123" },
  { role: "Admin", email: "admin1@atelier.test", password: "admin123" },
];

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

        <div className="mt-10 rounded-lg border border-dashed border-border-strong bg-surface p-4">
          <p className="eyebrow mb-3">Tài khoản demo</p>
          <ul className="space-y-2 text-body-sm">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-muted-foreground">{account.role}</span>
                <span className="font-mono text-caption text-foreground">
                  {account.email} / {account.password}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageContainer>
  );
}
