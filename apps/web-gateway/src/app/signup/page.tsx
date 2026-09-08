import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an Atelier account to buy or sell original art.",
};

export default function SignupPage() {
  return (
    <PageContainer className="py-16">
      <div className="mx-auto w-full max-w-md">
        <p className="eyebrow">Join Atelier</p>
        <h1 className="mt-2 font-display text-h2 text-foreground">Create account</h1>
        <p className="mt-3 text-body text-muted-foreground">
          Discover art for your space, or open your studio to buyers.
        </p>
        <div className="mt-8">
          <SignupForm />
        </div>
        <p className="mt-6 text-body-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </PageContainer>
  );
}
