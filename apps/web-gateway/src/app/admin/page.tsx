"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  ShieldQuestion,
  Package,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Truck,
  AlertCircle,
  CircleDot,
} from "lucide-react";
import type { AdminStats } from "@atelier/contracts";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { RevenueTrendChart } from "@/components/admin/RevenueTrendChart";
import { cn, formatPrice } from "@/lib/utils";
import { useApiResource } from "@/lib/client/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Tone = "success" | "warning" | "destructive" | "neutral";

const TONE_ICON_CLASS: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  neutral: "text-muted-foreground",
};
const TONE_FILL_CLASS: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  neutral: "bg-subdued",
};

/**
 * Every status a breakdown box renders here — validated against the
 * dataviz skill's palette checker, this design system's success/warning/
 * destructive tokens fall BELOW the colorblind-safe separation floor (some
 * pairs aren't reliably distinguishable even with normal color vision). So
 * color here is decorative reinforcement only; the icon shape is what
 * actually carries the identity, per row, always paired with the text label.
 */
const STATUS_STYLE: Record<string, { icon: ComponentType<{ className?: string }>; tone: Tone }> = {
  pending: { icon: Clock, tone: "warning" },
  confirmed: { icon: CircleDot, tone: "warning" },
  paid: { icon: CreditCard, tone: "success" },
  shipped: { icon: Truck, tone: "success" },
  completed: { icon: CheckCircle2, tone: "success" },
  verified: { icon: CheckCircle2, tone: "success" },
  resolved: { icon: CheckCircle2, tone: "success" },
  cancelled: { icon: XCircle, tone: "destructive" },
  rejected: { icon: XCircle, tone: "destructive" },
  failed: { icon: AlertCircle, tone: "destructive" },
  open: { icon: AlertCircle, tone: "warning" },
};
const DEFAULT_STATUS_STYLE = { icon: CircleDot, tone: "neutral" as Tone };

function StatusBreakdown({
  title,
  counts,
  linkBase,
  linkableStatuses,
}: {
  title: string;
  counts: Record<string, number>;
  linkBase?: string;
  /** Restricts which rows link out — admin.order_feed's "failed" bucket, for example, has no matching commerce.orders status to filter /admin/orders by. */
  linkableStatuses?: readonly string[];
}) {
  const entries = Object.entries(counts);
  const max = Math.max(...entries.map(([, count]) => count), 1);

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-caption text-muted-foreground">{title}</p>
      <dl className="mt-3 flex flex-col gap-2.5">
        {entries.map(([status, count]) => {
          const { icon: Icon, tone } = STATUS_STYLE[status] ?? DEFAULT_STATUS_STYLE;
          const row = (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-body-sm">
                <dt className="flex items-center gap-1.5 capitalize text-foreground">
                  <Icon className={cn("size-3.5 shrink-0", TONE_ICON_CLASS[tone])} />
                  {status}
                </dt>
                <dd className="font-medium text-foreground">{count}</dd>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", TONE_FILL_CLASS[tone])}
                  style={{ width: `${Math.max((count / max) * 100, count > 0 ? 4 : 0)}%` }}
                />
              </div>
            </div>
          );
          const canLink = linkBase && (!linkableStatuses || linkableStatuses.includes(status));
          return canLink ? (
            <Link
              key={status}
              href={`${linkBase}?status=${encodeURIComponent(status)}`}
              className="focus-ring -mx-2 rounded px-2 py-0.5 transition-colors hover:bg-muted"
            >
              {row}
            </Link>
          ) : (
            <div key={status} className="px-0 py-0.5">
              {row}
            </div>
          );
        })}
      </dl>
    </div>
  );
}

const TONE_BADGE_BG: Record<Tone, string> = {
  success: "bg-success-soft",
  warning: "bg-warning-soft",
  destructive: "bg-destructive-soft",
  neutral: "bg-accent-soft",
};
const TONE_BADGE_ICON: Record<Tone, string> = {
  success: "text-success-foreground",
  warning: "text-warning-foreground",
  destructive: "text-destructive-foreground",
  neutral: "text-accent-foreground",
};

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
  /** "Is this number fine or does it need attention?" — reserved status color on the icon chip, never the only signal (icon shape + label carry the meaning; see StatusBreakdown for why). */
  tone?: Tone;
}) {
  const content = (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", TONE_BADGE_BG[tone])}>
          <Icon className={cn("size-3.5", TONE_BADGE_ICON[tone])} />
        </span>
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
      <h1 className="mt-2 font-display text-h2 text-foreground">Admin overview</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/orders">Manage orders</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/exhibitions/manage">Manage exhibitions</Link>
        </Button>
      </div>

      {error ? (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-md border border-destructive bg-destructive-soft px-4 py-3 text-body-sm text-destructive-foreground">
          <span>Couldn&apos;t load stats: {error}</span>
          <Button size="sm" variant="outline" onClick={refresh}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[104px] w-full rounded-lg" />)
        ) : (
          <>
            <StatCard
              icon={ShieldQuestion}
              label="Artists pending review"
              value={String(data?.pendingArtists ?? 0)}
              href="/admin/artists/pending"
              tone={(data?.pendingArtists ?? 0) > 0 ? "warning" : "success"}
            />
            <StatCard
              icon={Package}
              label="Artworks pending review"
              value={String(data?.pendingArtworks ?? 0)}
              href="/admin/artworks/pending"
              tone={(data?.pendingArtworks ?? 0) > 0 ? "warning" : "success"}
            />
            <StatCard
              icon={AlertTriangle}
              label="Open complaints"
              value={String(data?.openComplaints ?? 0)}
              href="/admin/complaints"
              tone={(data?.openComplaints ?? 0) > 0 ? "destructive" : "success"}
            />
            <StatCard icon={DollarSign} label="Total revenue (orders placed)" value={formatPrice(data?.revenue ?? 0, "USD")} href="/admin/orders" />
          </>
        )}
      </div>

      {loading ? (
        <div className="mt-8">
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      ) : data?.revenueTrend ? (
        <div className="mt-8 rounded-lg border border-border bg-surface p-5">
          <p className="mb-4 text-caption text-muted-foreground">Revenue (last 30 days)</p>
          <RevenueTrendChart series={data.revenueTrend.series} currency={data.revenueTrend.currency} from={data.revenueTrend.from} to={data.revenueTrend.to} />
        </div>
      ) : null}

      {!loading && data ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatusBreakdown title="Orders" counts={data.orderStatusCounts} linkBase="/admin/orders" linkableStatuses={["pending", "paid", "shipped"]} />
          <StatusBreakdown title="Artist verification" counts={data.verificationStatusCounts.artists} />
          <StatusBreakdown title="Artwork verification" counts={data.verificationStatusCounts.artworks} />
          <StatusBreakdown title="Complaints" counts={data.complaintStatusCounts} />
        </div>
      ) : null}
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
