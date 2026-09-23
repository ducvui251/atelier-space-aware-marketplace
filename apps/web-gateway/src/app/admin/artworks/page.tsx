"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, ImageOff } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ArtworkImage } from "@/components/artwork/ArtworkImage";
import { formatPrice } from "@/lib/utils";
import { useApiResource } from "@/lib/client/hooks";
import { apiFetch } from "@/lib/client/api";
import type { Artwork } from "@/types";

const STATUS_OPTIONS = ["all", "pending", "verified", "rejected"] as const;
type StatusOption = (typeof STATUS_OPTIONS)[number];
const PAGE_SIZE = 25;

function isStatusOption(value: string | null): value is StatusOption {
  return value !== null && (STATUS_OPTIONS as readonly string[]).includes(value);
}

function statusVariant(status: string): "warning" | "success" | "destructive" {
  if (status === "verified") return "success";
  if (status === "rejected") return "destructive";
  return "warning";
}

function ArtworkRow({ artwork, onChanged }: { artwork: Artwork; onChanged: () => void }) {
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function review(status: "verified" | "rejected", note?: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/artworks/${encodeURIComponent(artwork.id)}/review`, { method: "POST", body: JSON.stringify({ status, note }) });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
        <ArtworkImage src={artwork.imageUrl} alt={artwork.title} fill sizes="64px" className="object-cover" />
      </div>
      <div className="min-w-[180px] flex-1">
        <p className="truncate text-body font-medium text-foreground">{artwork.title}</p>
        <p className="text-caption text-muted-foreground">{artwork.artist} · {formatPrice(artwork.price, artwork.currency)}</p>
      </div>
      <Badge variant={statusVariant(artwork.verificationStatus)} className="capitalize">
        {artwork.verificationStatus}
      </Badge>
      {artwork.verificationStatus === "pending" ? (
        rejecting ? (
          <div className="flex min-w-[260px] flex-1 flex-wrap items-center gap-2">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason" className="h-9 flex-1" />
            <Button size="sm" variant="outline" disabled={busy || !reason.trim()} onClick={() => review("rejected", reason.trim())}>
              Confirm reject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => review("verified")}>
              Approve
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(true)}>
              Reject
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}

function AdminArtworksView() {
  const searchParams = useSearchParams();
  const initialStatus = isStatusOption(searchParams.get("status")) ? (searchParams.get("status") as StatusOption) : "all";
  const [status, setStatus] = React.useState<StatusOption>(initialStatus);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (status !== "all") query.set("status", status);
  if (search.trim()) query.set("q", search.trim());

  const { data, loading, error, refresh } = useApiResource<{ items: Artwork[]; total: number }>(`/api/admin/artworks?${query.toString()}`);
  const artworks = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function changeStatus(next: StatusOption) {
    setStatus(next);
    setPage(1);
  }

  return (
    <>
      <Link href="/admin" className="focus-ring inline-flex items-center gap-2 text-body-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to admin overview
      </Link>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-2 font-display text-h2 text-foreground">Artworks</h1>
          <p className="mt-1 text-body-sm text-muted-foreground">{total} artwork{total === 1 ? "" : "s"}{status !== "all" ? ` · ${status}` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search by title…"
            className="h-10 w-48"
          />
          <select
            value={status}
            onChange={(event) => changeStatus(event.target.value as StatusOption)}
            className="focus-ring h-10 rounded-md border border-border bg-surface px-3 text-body-sm capitalize text-foreground"
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All statuses" : option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load artworks"
            description={error}
            action={<Button variant="outline" onClick={refresh}>Retry</Button>}
          />
        ) : artworks.length === 0 ? (
          <EmptyState icon={ImageOff} title="No artworks" description="No artworks match this filter." />
        ) : (
          <div className="flex flex-col gap-3">
            {artworks.map((artwork) => (
              <ArtworkRow key={artwork.id} artwork={artwork} onChanged={refresh} />
            ))}
          </div>
        )}
      </div>

      {!loading && !error && totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-caption text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      ) : null}
    </>
  );
}

export default function AdminArtworksPage() {
  return (
    <PageContainer className="py-16">
      <RequireRole role="admin">
        <Suspense fallback={null}>
          <AdminArtworksView />
        </Suspense>
      </RequireRole>
    </PageContainer>
  );
}
