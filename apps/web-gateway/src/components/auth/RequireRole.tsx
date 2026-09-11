"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import type { UserRole } from "@/types";
import { useAuth } from "@/lib/client/hooks";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

interface RequireRoleProps {
  role: UserRole | UserRole[];
  children: React.ReactNode;
}

export function RequireRole({ role, children }: RequireRoleProps) {
  const { currentUser, ready } = useAuth();
  const roles = Array.isArray(role) ? role : [role];

  if (!ready) return null;

  if (!currentUser) {
    return (
      <PageContainer className="py-16">
        <EmptyState
          icon={Lock}
          title="Sign in required"
          description="Sign in to continue to this area."
          action={
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  if (!roles.includes(currentUser.role)) {
    return (
      <PageContainer className="py-16">
        <EmptyState
          icon={Lock}
          title="Access denied"
          description={`This area is for ${roles.join(" or ")} accounts only.`}
          action={
            <Button asChild variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return <>{children}</>;
}
