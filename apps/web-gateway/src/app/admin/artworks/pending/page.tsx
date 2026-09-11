"use client";

import Link from "next/link";
import { ArrowLeft, ImageOff } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ReviewRow } from "@/components/admin/ReviewRow";
import { useApiResource } from "@/lib/client/hooks";
import { apiFetch } from "@/lib/client/api";
import type { Artwork } from "@/types";

function PendingArtworksQueue() {
  const { data, loading, error, refresh } = useApiResource<{ artists: unknown[]; artworks: Artwork[] }>("/api/admin/verification-queue");
  const pendingArtworks = data?.artworks ?? [];

  async function reviewArtwork(id: string, status: "verified" | "rejected", note?: string) {
    await apiFetch(`/api/admin/artworks/${encodeURIComponent(id)}/review`, { method: "POST", body: JSON.stringify({ status, note }) });
    refresh();
  }

  return (
    <>
      <Link
        href="/admin"
        className="focus-ring inline-flex items-center gap-2 text-body-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to admin overview
      </Link>

      <p className="eyebrow mt-6">Admin</p>
      <h1 className="mt-2 font-display text-h2 text-foreground">
        Artworks pending review {loading ? "" : `(${pendingArtworks.length})`}
      </h1>

      {error ? (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-md border border-destructive bg-destructive-soft px-4 py-3 text-body-sm text-destructive-foreground">
          <span>Couldn&apos;t load the queue: {error}</span>
          <Button size="sm" variant="outline" onClick={refresh}>
            Retry
          </Button>
        </div>
      ) : loading ? (
        <div className="mt-8 flex flex-col gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : pendingArtworks.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={ImageOff} title="No artworks pending review" description="New listings will show up here." />
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {pendingArtworks.map((artwork) => (
            <ReviewRow
              key={artwork.id}
              title={artwork.title}
              subtitle={`${artwork.artist} · ${artwork.medium}`}
              imageUrl={artwork.imageUrl}
              onApprove={() => reviewArtwork(artwork.id, "verified")}
              onReject={(reason) => reviewArtwork(artwork.id, "rejected", reason)}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function PendingArtworksPage() {
  return (
    <PageContainer className="py-16">
      <RequireRole role="admin">
        <PendingArtworksQueue />
      </RequireRole>
    </PageContainer>
  );
}
