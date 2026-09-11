"use client";

import Link from "next/link";
import { AlertCircle, ImageOff } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Grid } from "@/components/layout/Grid";
import { RequireRole } from "@/components/auth/RequireRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ArtworkImage } from "@/components/artwork/ArtworkImage";
import { artworkAspect } from "@/lib/artwork-aspect";
import { formatPrice } from "@/lib/utils";
import { useAuth, useApiResource } from "@/lib/client/hooks";
import type { Artwork, VerificationStatus } from "@/types";

function verificationVariant(status: VerificationStatus) {
  if (status === "verified") return "success" as const;
  if (status === "rejected") return "destructive" as const;
  return "warning" as const;
}

function verificationLabel(status: VerificationStatus) {
  if (status === "verified") return "Verified";
  if (status === "rejected") return "Rejected";
  return "Pending review";
}

function ArtworkListingCard({ artwork }: { artwork: Artwork }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className={`relative w-full overflow-hidden bg-muted ${artworkAspect(artwork.orientation)}`}>
        <ArtworkImage
          src={artwork.imageUrl}
          alt={artwork.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-h3 text-foreground">{artwork.title}</h3>
          <Badge variant={verificationVariant(artwork.verificationStatus)} className="shrink-0">
            {verificationLabel(artwork.verificationStatus)}
          </Badge>
        </div>
        <p className="text-body-sm text-foreground">{formatPrice(artwork.price, artwork.currency)}</p>
        {artwork.widthCm && artwork.heightCm ? (
          <p className="text-caption text-subdued">
            {artwork.widthCm} × {artwork.heightCm} cm
          </p>
        ) : null}
        <p className="text-caption capitalize text-muted-foreground">{artwork.availability}</p>

        {artwork.verificationStatus === "rejected" && artwork.verificationNote ? (
          <div className="mt-1 flex items-start gap-2 rounded-md border border-destructive bg-destructive-soft px-3 py-2 text-caption text-destructive-foreground">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <div>
              <p className="font-medium">Rejection reason</p>
              <p>{artwork.verificationNote}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-auto pt-2">
          <Link
            href={`/artist/artworks/${artwork.id}/edit`}
            className="focus-ring text-caption underline underline-offset-2 hover:text-foreground"
          >
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}

function ArtworkListingGridSkeleton() {
  return (
    <Grid columns={3}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-[9/11] w-full rounded-lg" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </Grid>
  );
}

function ArtistDashboard() {
  const { currentArtist } = useAuth();
  const { data, loading, error, refresh } = useApiResource<{ items: Artwork[]; total: number }>("/api/artist/artworks");
  const listings = data?.items ?? [];
  if (!currentArtist) return null;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Artist dashboard</p>
          <h1 className="mt-2 font-display text-h2 text-foreground">{currentArtist.displayName}</h1>
          <Badge variant={verificationVariant(currentArtist.verificationStatus)} className="mt-2">
            {verificationLabel(currentArtist.verificationStatus)}
          </Badge>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/artist/orders">Orders</Link>
          </Button>
          <Button asChild>
            <Link href="/artist/artworks/new">+ New listing</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="mt-10">
          <ArtworkListingGridSkeleton />
        </div>
      ) : error ? (
        <div className="mt-10 flex items-center justify-between gap-3 rounded-md border border-destructive bg-destructive-soft px-4 py-3 text-body-sm text-destructive-foreground">
          <span>Couldn&apos;t load your listings: {error}</span>
          <Button size="sm" variant="outline" onClick={refresh}>
            Retry
          </Button>
        </div>
      ) : listings.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={ImageOff}
            title="No listings yet"
            description="Create your first listing to get started."
            action={
              <Button asChild>
                <Link href="/artist/artworks/new">+ New listing</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-10">
          <Grid columns={3}>
            {listings.map((artwork) => (
              <ArtworkListingCard key={artwork.id} artwork={artwork} />
            ))}
          </Grid>
        </div>
      )}
    </>
  );
}

export default function ArtistPage() {
  return (
    <PageContainer className="py-16">
      <RequireRole role="artist">
        <ArtistDashboard />
      </RequireRole>
    </PageContainer>
  );
}
