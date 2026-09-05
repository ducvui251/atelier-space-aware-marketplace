"use client";

import Link from "next/link";
import { AlertTriangle, ShieldQuestion, Package, DollarSign } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { formatPrice } from "@/lib/utils";
import { useAppState } from "@/lib/store/hooks";

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
  const { db } = useAppState();
  const pendingArtists = db.artists.filter((a) => a.verificationStatus === "pending").length;
  const pendingArtworks = db.artworks.filter((a) => a.verificationStatus === "pending").length;
  const openComplaints = db.complaints.filter((c) => c.status === "open").length;
  const revenue = db.orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <>
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 font-display text-h2 text-foreground">Quản trị hệ thống</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ShieldQuestion} label="Nghệ sĩ chờ duyệt" value={String(pendingArtists)} href="/admin/verification" />
        <StatCard icon={Package} label="Tác phẩm chờ duyệt" value={String(pendingArtworks)} href="/admin/verification" />
        <StatCard icon={AlertTriangle} label="Khiếu nại đang mở" value={String(openComplaints)} href="/admin/complaints" />
        <StatCard icon={DollarSign} label="Tổng doanh thu (đơn đã tạo)" value={formatPrice(revenue, "USD")} />
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
