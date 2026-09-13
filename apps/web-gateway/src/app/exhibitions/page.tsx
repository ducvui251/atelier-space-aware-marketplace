import type { Metadata } from "next";
import type { Exhibition } from "@atelier/contracts";
import { PageContainer } from "@/components/layout/PageContainer";
import { ExhibitionCard } from "@/components/exhibitions/ExhibitionCard";
import { findArtwork } from "@/lib/gateway/clients/artwork.client";
import { listPublishedExhibitions } from "@/lib/gateway/clients/exhibition.client";
import { displayableImageUrl } from "@/lib/image-hosts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Exhibitions",
  description: "Explore virtual exhibitions curated by Atelier artists.",
};

async function getPreviewImageUrl(exhibition: Exhibition): Promise<string> {
  if (!exhibition.previewArtworkId) return "";

  try {
    const artwork = await findArtwork(exhibition.previewArtworkId);
    return displayableImageUrl(artwork?.imageUrl);
  } catch {
    return "";
  }
}

export default async function ExhibitionsPage() {
  let exhibitions: Exhibition[];

  try {
    exhibitions = await listPublishedExhibitions();
  } catch {
    return (
      <PageContainer className="py-12">
        <section aria-labelledby="exhibitions-title" className="max-w-2xl">
          <p className="eyebrow">Explore</p>
          <h1 id="exhibitions-title" className="mt-2 font-display text-h1 text-foreground">
            Exhibitions
          </h1>
          <p role="status" className="mt-4 text-body text-muted-foreground">
            Exhibitions are temporarily unavailable. Please try again in a moment.
          </p>
        </section>
      </PageContainer>
    );
  }

  const previewImageUrls = await Promise.all(exhibitions.map(getPreviewImageUrl));

  return (
    <PageContainer className="py-12">
      <section aria-labelledby="exhibitions-title">
        <p className="eyebrow">Explore</p>
        <h1 id="exhibitions-title" className="mt-2 font-display text-h1 text-foreground">
          Exhibitions
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-muted-foreground">
          Step inside virtual galleries curated by Atelier artists.
        </p>
      </section>

      {exhibitions.length ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {exhibitions.map((exhibition, index) => (
            <ExhibitionCard
              key={exhibition.id}
              exhibition={exhibition}
              previewImageUrl={previewImageUrls[index]}
            />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-lg border border-border bg-surface px-6 py-12 text-center">
          <h2 className="font-display text-h2 text-foreground">No exhibitions yet</h2>
          <p className="mt-2 text-body text-muted-foreground">
            Published artist exhibitions will appear here.
          </p>
        </div>
      )}
    </PageContainer>
  );
}
