"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, UserX } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ArtworkImage } from "@/components/artwork/ArtworkImage";
import { useApiResource } from "@/lib/client/hooks";
import { apiFetch } from "@/lib/client/api";
import type { Artist } from "@/types";

const STATUS_OPTIONS = ["all", "pending", "verified", "rejected"] as const;
type StatusOption = (typeof STATUS_OPTIONS)[number];

function isStatusOption(value: string | null): value is StatusOption {
  return value !== null && (STATUS_OPTIONS as readonly string[]).includes(value);
}

function statusVariant(status: string): "warning" | "success" | "destructive" {
  if (status === "verified") return "success";
  if (status === "rejected") return "destructive";
  return "warning";
}

function ArtistRow({ artist, onChanged }: { artist: Artist; onChanged: () => void }) {
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function review(status: "verified" | "rejected", note?: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/artists/${encodeURIComponent(artist.id)}/review`, { method: "POST", body: JSON.stringify({ status, note }) });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-muted">
        <ArtworkImage src={artist.imageUrl} alt={artist.displayName} fill sizes="48px" className="object-cover" />
      </div>
      <div className="min-w-[180px] flex-1">
        <p className="truncate text-body font-medium text-foreground">{artist.displayName}</p>
        <p className="text-caption text-muted-foreground">{artist.location}{artist.nationality ? ` · ${artist.nationality}` : ""}</p>
      </div>
      <Badge variant={statusVariant(artist.verificationStatus)} className="capitalize">
        {artist.verificationStatus}
      </Badge>
      {artist.verificationStatus === "pending" ? (
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

function AdminArtistsView() {
  const searchParams = useSearchParams();
  const initialStatus = isStatusOption(searchParams.get("status")) ? (searchParams.get("status") as StatusOption) : "all";
  const [status, setStatus] = React.useState<StatusOption>(initialStatus);

  const query = new URLSearchParams();
  if (status !== "all") query.set("status", status);

  const { data, loading, error, refresh } = useApiResource<{ items: Artist[]; total: number }>(`/api/admin/artists?${query.toString()}`);
  const artists = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <Link href="/admin" className="focus-ring inline-flex items-center gap-2 text-body-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to admin overview
      </Link>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-2 font-display text-h2 text-foreground">Artists</h1>
          <p className="mt-1 text-body-sm text-muted-foreground">{total} artist{total === 1 ? "" : "s"}{status !== "all" ? ` · ${status}` : ""}</p>
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusOption)}
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

      <div className="mt-8">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load artists"
            description={error}
            action={<Button variant="outline" onClick={refresh}>Retry</Button>}
          />
        ) : artists.length === 0 ? (
          <EmptyState icon={UserX} title="No artists" description="No artists match this filter." />
        ) : (
          <div className="flex flex-col gap-3">
            {artists.map((artist) => (
              <ArtistRow key={artist.id} artist={artist} onChanged={refresh} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminArtistsPage() {
  return (
    <PageContainer className="py-16">
      <RequireRole role="admin">
        <Suspense fallback={null}>
          <AdminArtistsView />
        </Suspense>
      </RequireRole>
    </PageContainer>
  );
}
