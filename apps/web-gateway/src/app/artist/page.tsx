"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, ImageOff, Lock } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Grid } from "@/components/layout/Grid";
import { RequireRole } from "@/components/auth/RequireRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/discovery/SearchInput";
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

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;

function ArtistDashboard() {
  const { currentArtist } = useAuth();
  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (search) query.set("q", search);
  const { data, loading, error, refresh } = useApiResource<{ items: Artwork[]; total: number }>(`/api/artist/artworks?${query.toString()}`);
  const listings = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (!currentArtist) return null;
  const isVerified = currentArtist.verificationStatus === "verified";

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
          {isVerified ? (
            <Button asChild variant="outline">
              <Link href="/exhibitions/manage">Exhibitions</Link>
            </Button>
          ) : (
            <Button variant="outline" disabled title="Your artist profile must be verified first">
              <Lock className="size-3.5" /> Exhibitions
            </Button>
          )}
          {isVerified ? (
            <Button asChild variant="outline">
              <Link href="/artist/analytics">Analytics</Link>
            </Button>
          ) : (
            <Button variant="outline" disabled title="Your artist profile must be verified first">
              <Lock className="size-3.5" /> Analytics
            </Button>
          )}
          {isVerified ? (
            <Button asChild variant="outline">
              <Link href="/artist/orders">Orders</Link>
            </Button>
          ) : (
            <Button variant="outline" disabled title="Your artist profile must be verified first">
              <Lock className="size-3.5" /> Orders
            </Button>
          )}
          {isVerified ? (
            <Button asChild>
              <Link href="/artist/artworks/new">+ New listing</Link>
            </Button>
          ) : (
            <Button disabled title="Your artist profile must be verified first">
              <Lock className="size-3.5" /> New listing
            </Button>
          )}
        </div>
      </div>

      {!isVerified ? (
        <p role="status" className="mt-6 rounded-md border border-border bg-muted/50 px-4 py-3 text-body-sm text-muted-foreground">
          Your artist profile is {verificationLabel(currentArtist.verificationStatus).toLowerCase()}. Until an admin verifies your
          profile, you can only update your account info — exhibitions, analytics, orders, and listing artwork stay locked.
        </p>
      ) : null}

      {isVerified ? (
        <div className="mt-8 max-w-xl">
          <SearchInput
            id="artist-artwork-search"
            placeholder="Search your listings by title…"
            ariaLabel="Search your listings"
            defaultValue={searchInput}
            onChange={setSearchInput}
          />
        </div>
      ) : null}

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
          {search ? (
            <EmptyState
              icon={ImageOff}
              title="No listings match your search"
              description={`Nothing found for "${search}". Clear the search box above and try a different title.`}
            />
          ) : (
            <EmptyState
              icon={ImageOff}
              title="No listings yet"
              description="Create your first listing to get started."
              action={
                isVerified ? (
                  <Button asChild>
                    <Link href="/artist/artworks/new">+ New listing</Link>
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-8">
          <Grid columns={3}>
            {listings.map((artwork) => (
              <ArtworkListingCard key={artwork.id} artwork={artwork} />
            ))}
          </Grid>
          <p className="text-center text-caption text-muted-foreground">
            Page {page} of {totalPages} · {total} listing{total === 1 ? "" : "s"}
          </p>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} label="Your listings pages" />
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
