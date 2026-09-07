"use client";

import Link from "next/link";
import { AlertTriangle, ShieldQuestion, Package, DollarSign } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { formatPrice } from "@/lib/utils";
import { useApiResource } from "@/lib/client/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface AdminStats {
  pendingArtists: number;
  pendingArtworks: number;
  openComplaints: number;
  totalOrders: number;
  revenue: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-caption">{label}</span>
      </div>
      <p className="mt-3 font-display text-h2 text-foreground">{value}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="focus-ring block rounded-lg transition-transform hover:-translate-y-0.5">
      {content}
    </Link>
  ) : (
    content
  );
}

function AdminOverview() {
  const { data, loading, error, refresh } = useApiResource<AdminStats>("/api/admin/stats");

  return (
    <>
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 font-display text-h2 text-foreground">Quản trị hệ thống</h1>

      {error ? (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-md border border-destructive bg-destructive-soft px-4 py-3 text-body-sm text-destructive-foreground">
          <span>Không thể tải số liệu: {error}</span>
          <Button size="sm" variant="outline" onClick={refresh}>
            Thử lại
          </Button>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[104px] w-full rounded-lg" />)
        ) : (
          <>
            <StatCard icon={ShieldQuestion} label="Nghệ sĩ chờ duyệt" value={String(data?.pendingArtists ?? 0)} href="/admin/verification" />
            <StatCard icon={Package} label="Tác phẩm chờ duyệt" value={String(data?.pendingArtworks ?? 0)} href="/admin/verification" />
            <StatCard icon={AlertTriangle} label="Khiếu nại đang mở" value={String(data?.openComplaints ?? 0)} href="/admin/complaints" />
            <StatCard icon={DollarSign} label="Tổng doanh thu (đơn đã tạo)" value={formatPrice(data?.revenue ?? 0, "USD")} />
          </>
        )}
      </div>
    </>
  );
}

export default function AdminPage() {
  return (
    <PageContainer className="py-16">
      <RequireRole role="admin">
        <AdminOverview />
      </RequireRole>
    </PageContainer>
  );
}
