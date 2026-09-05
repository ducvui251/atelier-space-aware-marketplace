"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import type { UserRole } from "@/types";
import { useAuth } from "@/lib/store/hooks";
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
          title="Bạn cần đăng nhập"
          description="Đăng nhập để tiếp tục với khu vực này."
          action={
            <Button asChild>
              <Link href="/login">Đăng nhập</Link>
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
          title="Không có quyền truy cập"
          description={`Khu vực này dành cho tài khoản ${roles.join(" hoặc ")}.`}
          action={
            <Button asChild variant="outline">
              <Link href="/">Về trang chủ</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return <>{children}</>;
}
