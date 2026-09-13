"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, WifiOff } from "lucide-react";
import type { ArtistArtworkViews, ArtistAudience, ArtistEarnings } from "@atelier/contracts";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArtworkImage } from "@/components/artwork/ArtworkImage";
import { RevenueTrendChart } from "@/components/admin/RevenueTrendChart";
import { formatPrice } from "@/lib/utils";
import { useApiResource } from "@/lib/client/hooks";

interface Section<T> {
  data: T | null;
  unavailable: boolean;
}

interface ArtworkPerformanceRow {
  artworkId: string;
  title: string;
  imageUrl: string;
  availability: string;
  verificationStatus: string;
  saves: number;
  views: number | null;
  salesCount: number;
  revenue: number;
}

interface ArtistAnalyticsResponse {
  artistId: string;
  period: "day" | "week" | "month";
  correlationId: string;
  earnings: Section<ArtistEarnings>;
  audience: Section<ArtistAudience>;
  views: Section<ArtistArtworkViews>;
  artworkPerformance: Section<ArtworkPerformanceRow[]>;
  conversion: { data: { eligibleOrders: number; views: number; rate: number | null } | null; unavailable: boolean; reason: string | null };
}

function UnavailableCard({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface p-5 text-caption text-muted-foreground">
      <WifiOff className="size-4 shrink-0" />
      {label} is unavailable right now.
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-caption text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-h3 text-foreground">{value}</p>
    </div>
  );
}

function ArtistAnalyticsView() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");
  const { data, loading, error, refresh } = useApiResource<ArtistAnalyticsResponse>(`/api/artist/analytics?period=${period}`);

  return (
    <>
      <Link href="/artist" className="focus-ring inline-flex items-center gap-2 text-body-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      <p className="eyebrow mt-6">Artist dashboard</p>
      <h1 className="mt-2 font-display text-h2 text-foreground">Analytics</h1>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <p className="text-body-sm text-muted-foreground">
          Revenue, views, and sales cover the last 90 days; saves show current totals. Select revenue grouping.
        </p>
        <label className="flex flex-col gap-1.5 text-label text-foreground" htmlFor="analytics-period">
          Revenue grouping
          <select
            id="analytics-period"
            value={period}
            onChange={(event) => setPeriod(event.target.value as typeof period)}
            className="focus-ring h-11 min-w-36 rounded-md border border-border bg-surface px-4 text-body text-foreground"
          >
            <option value="day">By day</option>
            <option value="week">By week</option>
            <option value="month">By month</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-md border border-destructive bg-destructive-soft px-4 py-3 text-body-sm text-destructive-foreground">
          <span>Couldn&apos;t load analytics: {error}</span>
          <button type="button" onClick={refresh} className="focus-ring underline underline-offset-2">
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[88px] w-full rounded-lg" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.earnings.unavailable || !data.earnings.data ? (
              <UnavailableCard label="Earnings" />
            ) : (
              <>
                <KpiCard label="Received" value={formatPrice(data.earnings.data.received, data.earnings.data.currency)} />
                <KpiCard label="Pending payment" value={formatPrice(data.earnings.data.pendingPayment, data.earnings.data.currency)} />
                <KpiCard label="Refunded" value={formatPrice(data.earnings.data.refunded, data.earnings.data.currency)} />
              </>
            )}
            {data.audience.unavailable || !data.audience.data ? (
              <UnavailableCard label="Audience" />
            ) : (
              <KpiCard
                label="Followers"
                value={`${data.audience.data.totalFollowers} (${data.audience.data.growth >= 0 ? "+" : ""}${data.audience.data.growth} vs previous ${period})`}
              />
            )}
          </div>

          <div className="mt-6 rounded-lg border border-border bg-surface p-5">
            <p className="mb-4 text-caption text-muted-foreground">Revenue trend</p>
            {data.earnings.unavailable || !data.earnings.data ? (
              <UnavailableCard label="Revenue trend" />
            ) : (
              <RevenueTrendChart
                series={data.earnings.data.trend.map((t) => ({ period: t.period, amount: t.net }))}
                currency={data.earnings.data.currency}
                from={data.earnings.data.from}
                to={data.earnings.data.to}
              />
            )}
          </div>

          <div className="mt-6 rounded-lg border border-border bg-surface p-5">
            <p className="text-caption text-muted-foreground">Conversion</p>
            {data.conversion.unavailable || !data.conversion.data ? (
              <p className="mt-2 text-body-sm text-muted-foreground">
                Unavailable — {data.conversion.reason ?? "Required analytics data is unavailable"}.
              </p>
            ) : data.conversion.data.rate === null ? (
              <p className="mt-2 text-body-sm text-muted-foreground">
                No views yet ({data.conversion.data.eligibleOrders} eligible orders, 0 unique daily views).
              </p>
            ) : (
              <>
                <p className="mt-2 font-display text-h3 text-foreground">
                  {(data.conversion.data.rate * 100).toFixed(1)}%
                </p>
                <p className="mt-1 text-body-sm text-muted-foreground">
                  {data.conversion.data.eligibleOrders} eligible orders / {data.conversion.data.views} unique daily views in the last 90 days.
                </p>
              </>
            )}
          </div>

          <div className="mt-8">
            <p className="mb-3 text-caption text-muted-foreground">Artwork performance</p>
            {data.artworkPerformance.unavailable || !data.artworkPerformance.data ? (
              <UnavailableCard label="Artwork performance" />
            ) : data.artworkPerformance.data.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No listings yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-body-sm">
                  <thead className="bg-muted text-caption text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Artwork</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Views</th>
                      <th className="px-4 py-3 text-left">Saves</th>
                      <th className="px-4 py-3 text-left">Sales</th>
                      <th className="px-4 py-3 text-left">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.artworkPerformance.data.map((row) => (
                      <tr key={row.artworkId} className="border-t border-border">
                        <td className="flex items-center gap-3 px-4 py-3 text-foreground">
                          <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                            <ArtworkImage src={row.imageUrl} alt={row.title} fill sizes="40px" className="object-cover" />
                          </div>
                          {row.title}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={row.verificationStatus === "verified" ? "success" : row.verificationStatus === "rejected" ? "destructive" : "warning"}>
                            {row.verificationStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3" aria-label={row.views === null ? "Views unavailable" : `${row.views} views`}>
                          {row.views ?? "—"}
                        </td>
                        <td className="px-4 py-3">{row.saves}</td>
                        <td className="px-4 py-3">{row.salesCount}</td>
                        <td className="px-4 py-3">{formatPrice(row.revenue, "USD")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}

export default function ArtistAnalyticsPage() {
  return (
    <PageContainer className="py-16">
      <RequireRole role="artist">
        <ArtistAnalyticsView />
      </RequireRole>
    </PageContainer>
  );
}

