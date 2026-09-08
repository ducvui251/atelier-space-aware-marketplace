"use client";

import * as React from "react";
import Image from "next/image";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiResource } from "@/lib/client/hooks";
import { apiFetch } from "@/lib/client/api";
import type { Artist, Artwork } from "@/types";

function ReviewRow({
  title,
  subtitle,
  imageUrl,
  onApprove,
  onReject,
}: {
  title: string;
  subtitle: string;
  imageUrl: string;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState("");

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
        <Image src={imageUrl} alt={title} fill sizes="64px" className="object-cover" />
      </div>
      <div className="min-w-[180px] flex-1">
        <p className="text-body font-medium text-foreground">{title}</p>
        <p className="text-caption text-muted-foreground">{subtitle}</p>
      </div>
      {rejecting ? (
        <div className="flex min-w-[260px] flex-1 flex-wrap items-center gap-2">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Lý do từ chối"
            className="h-9 flex-1"
          />
          <Button size="sm" variant="outline" disabled={!reason.trim()} onClick={() => onReject(reason.trim())}>
            Xác nhận từ chối
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
            Huỷ
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" onClick={onApprove}>
            Duyệt
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>
            Từ chối
          </Button>
        </div>
      )}
    </div>
  );
}

function VerificationQueue() {
  const { data, loading, error, refresh } = useApiResource<{ artists: Artist[]; artworks: Artwork[] }>("/api/admin/verification-queue");
  const pendingArtists = data?.artists ?? [];
  const pendingArtworks = data?.artworks ?? [];

  async function reviewArtist(id: string, status: "verified" | "rejected", note?: string) {
    await apiFetch(`/api/admin/artists/${encodeURIComponent(id)}/review`, { method: "POST", body: JSON.stringify({ status, note }) });
    refresh();
  }

  async function reviewArtwork(id: string, status: "verified" | "rejected", note?: string) {
    await apiFetch(`/api/admin/artworks/${encodeURIComponent(id)}/review`, { method: "POST", body: JSON.stringify({ status, note }) });
    refresh();
  }

  return (
    <>
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 font-display text-h2 text-foreground">Hàng chờ xác thực</h1>

      {error ? (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-md border border-destructive bg-destructive-soft px-4 py-3 text-body-sm text-destructive-foreground">
          <span>Không thể tải hàng chờ: {error}</span>
          <Button size="sm" variant="outline" onClick={refresh}>
            Thử lại
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 flex flex-col gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
      <section className="mt-8">
        <h2 className="mb-3 font-display text-h3 text-foreground">
          Nghệ sĩ ({pendingArtists.length})
        </h2>
        {pendingArtists.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">Không có nghệ sĩ chờ duyệt.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingArtists.map((artist) => (
              <ReviewRow
                key={artist.id}
                title={artist.displayName}
                subtitle={`${artist.location} · ${artist.nationality}`}
                imageUrl={artist.imageUrl}
                onApprove={() => reviewArtist(artist.id, "verified")}
                onReject={(reason) => reviewArtist(artist.id, "rejected", reason)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-h3 text-foreground">
          Tác phẩm ({pendingArtworks.length})
        </h2>
        {pendingArtworks.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">Không có tác phẩm chờ duyệt.</p>
        ) : (
          <div className="flex flex-col gap-3">
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
      </section>
        </>
      )}
    </>
  );
}

export default function AdminVerificationPage() {
  return (
    <PageContainer className="py-16">
      <RequireRole role="admin">
        <VerificationQueue />
      </RequireRole>
    </PageContainer>
  );
}
