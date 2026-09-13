"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PublicDomainArtwork, PublicDomainArtworkPageResponse } from "@atelier/contracts";
import { PublicDomainArtworkPageResponseSchema } from "@atelier/contracts";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const PAGE_SIZE = 24;

interface OpenCollectionBrowserProps {
  page: number;
}

interface ArtworkImagePreviewProps {
  src: string;
  alt: string;
}

function ArtworkImagePreview({ src, alt }: ArtworkImagePreviewProps) {
  const [unavailable, setUnavailable] = React.useState(false);

  if (unavailable) {
    return (
      <div
        role="img"
        aria-label={"Image unavailable for " + alt}
        className="flex h-full items-center justify-center p-4 text-center text-caption text-muted-foreground"
      >
        Artwork image is unavailable right now.
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      onError={() => setUnavailable(true)}
      className="object-contain transition-transform duration-normal [transition-timing-function:var(--ease-out)] group-hover:scale-[1.02]"
    />
  );
}

export function OpenCollectionBrowser({ page }: OpenCollectionBrowserProps) {
  const router = useRouter();
  const [result, setResult] = React.useState<PublicDomainArtworkPageResponse | null>(null);
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [retryCount, setRetryCount] = React.useState(0);
  const [selectedArtwork, setSelectedArtwork] = React.useState<PublicDomainArtwork | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setResult(null);
    setSelectedArtwork(null);

    async function loadPage() {
      try {
        const response = await fetch("/api/artworks/reference?page=" + page + "&limit=" + PAGE_SIZE, { signal: controller.signal });
        if (!response.ok) throw new Error("Reference collection request failed");
        const payload: unknown = await response.json();
        const parsed = PublicDomainArtworkPageResponseSchema.safeParse(payload);
        if (!parsed.success) throw new Error("Reference collection response was invalid");
        setResult(parsed.data);
      } catch (requestError) {
        if (!(requestError instanceof DOMException && requestError.name === "AbortError")) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadPage();

    return () => controller.abort();
  }, [page, retryCount]);

  function openArtwork(artwork: PublicDomainArtwork) {
    setSelectedArtwork(artwork);
  }

  function goToPage(targetPage: number) {
    const query = targetPage === 1 ? "" : "?page=" + targetPage;
    router.push("/artworks/reference" + query, { scroll: false });
  }

  if (loading) {
    return <p aria-live="polite" className="text-body-sm text-muted-foreground">Loading this page of the collection…</p>;
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-border bg-surface p-6">
        <p className="text-body-sm text-foreground">The public collection could not be loaded.</p>
        <Button className="mt-4" variant="outline" onClick={() => setRetryCount((current) => current + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  if (!result || result.items.length === 0) {
    return <p className="text-body-sm text-muted-foreground">No public-domain artworks were found on this page.</p>;
  }

  const firstResult = (result.page - 1) * result.limit + 1;
  const lastResult = Math.min(firstResult + result.items.length - 1, result.total);

  return (
    <>
      <p className="mb-6 text-caption text-muted-foreground" aria-live="polite">
        Showing {firstResult}–{lastResult} of {result.total.toLocaleString()} CC0 works from the Cleveland Museum of Art
      </p>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {result.items.map((artwork) => (
          <li key={artwork.id}>
            <article className="flex h-full flex-col">
              <button
                type="button"
                onClick={() => openArtwork(artwork)}
                className="group focus-ring block w-full text-left"
                aria-label={"Open artwork preview for " + artwork.title}
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
                  <ArtworkImagePreview src={artwork.imageUrl} alt={artwork.imageAltText} />
                </div>
              </button>
              <button
                type="button"
                onClick={() => openArtwork(artwork)}
                className="mt-4 block text-left focus-ring"
              >
                <h2 className="font-display text-h3 text-foreground">{artwork.title}</h2>
              </button>
              <p className="mt-1 text-body-sm text-muted-foreground">{artwork.artistName}</p>
              <p className="mt-2 text-caption text-subdued">{artwork.dateDisplay} · {artwork.mediumDisplay}</p>
              <p className="mt-1 text-caption text-subdued">{artwork.dimensions}</p>
              <Link href={artwork.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 text-caption font-medium text-foreground underline underline-offset-4">
                View museum record
              </Link>
            </article>
          </li>
        ))}
      </ul>
      <nav aria-label="Public-domain collection pages" className="mt-10 flex items-center justify-center gap-5">
        <Button variant="outline" disabled={!result.hasPreviousPage} onClick={() => goToPage(result.page - 1)}>
          Previous
        </Button>
        <span className="text-caption text-muted-foreground">
          Page {result.page.toLocaleString()} of {result.totalPages.toLocaleString()}
        </span>
        <Button variant="outline" disabled={!result.hasNextPage} onClick={() => goToPage(result.page + 1)}>
          Next
        </Button>
      </nav>
      <Sheet open={selectedArtwork !== null} onOpenChange={(open) => { if (!open) setSelectedArtwork(null); }}>
        {selectedArtwork && (
          <SheetContent side="right" className="inset-0 h-dvh w-full max-w-none border-0 bg-background p-5 sm:p-8">
            <div className="flex h-full flex-col gap-4">
              <div className="pr-12">
                <SheetTitle className="font-display text-h2">{selectedArtwork.title}</SheetTitle>
                <DialogPrimitive.Description className="mt-2 text-body-sm text-muted-foreground">
                  {selectedArtwork.artistName} · {selectedArtwork.dateDisplay}
                </DialogPrimitive.Description>
              </div>
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-muted">
                <ArtworkImagePreview key={selectedArtwork.id} src={selectedArtwork.imageFullUrl} alt={selectedArtwork.imageAltText} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-caption text-muted-foreground">
                  {selectedArtwork.mediumDisplay} · {selectedArtwork.dimensions}
                </p>
                <Link href={selectedArtwork.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-caption font-medium text-foreground underline underline-offset-4">
                  View museum record
                </Link>
              </div>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </>
  );
}
