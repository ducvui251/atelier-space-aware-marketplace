import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { SearchInput } from "@/components/discovery/SearchInput";
import { DualViewToggle } from "@/components/discovery/DualViewToggle";
import { FilterableArtworks } from "@/components/discovery/FilterableArtworks";
import { getArtworks } from "@/features/artworks/services/artwork.service";

export const metadata: Metadata = {
  title: "Artworks",
  description:
    "Browse original and limited-edition artworks filtered by style, color, medium, price, size, orientation, and room.",
};

export default async function ArtworksPage() {
  const artworks = await getArtworks();

  return (
    <PageContainer className="py-10">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1 className="mt-2 font-display text-h1 text-foreground">
            Artworks
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <DualViewToggle />
        </div>
      </div>

      <div id="search" className="mt-8">
        <SearchInput className="max-w-xl" />
      </div>

      <div className="mt-5">
        <FilterableArtworks artworks={artworks} />
      </div>
    </PageContainer>
  );
}
