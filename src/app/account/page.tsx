import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Account",
  description: "Your Atelier account.",
};

export default function AccountPage() {
  return (
    <PageContainer className="py-16">
      <p className="eyebrow">Account</p>
      <h1 className="mt-2 font-display text-h2 text-foreground">Your account</h1>
      <p className="mt-3 max-w-xl text-body text-muted-foreground">
        You are signed in. Account features arrive in a later step.
      </p>
      <div className="mt-8">
        <Button variant="outline" asChild>
          <Link href="/artworks">Browse artworks</Link>
        </Button>
      </div>
    </PageContainer>
  );
}
