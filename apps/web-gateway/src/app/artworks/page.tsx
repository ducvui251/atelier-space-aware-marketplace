import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { DualViewToggle } from "@/components/discovery/DualViewToggle";
import { FilterableArtworks } from "@/components/discovery/FilterableArtworks";
import { searchCatalogArtworks } from "@/lib/gateway/clients/artwork.client";
import { priceBucketToRange, type ArtworkFilterQuery } from "@/lib/artwork-filters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Artworks",
  description:
    "Browse original and limited-edition artworks filtered by style, color, medium, price, size, orientation, and room.",
};

interface ArtworksPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function toQuery(searchParams: Record<string, string | string[] | undefined>): ArtworkFilterQuery {
  return {
    q: firstValue(searchParams.q),
    style: firstValue(searchParams.style),
    color: firstValue(searchParams.color),
    orientation: firstValue(searchParams.orientation),
    edition: firstValue(searchParams.edition),
    availability: firstValue(searchParams.availability),
    price: firstValue(searchParams.price),
  };
}

export default async function ArtworksPage({ searchParams }: ArtworksPageProps) {
  const params = await searchParams;
  const query = toQuery(params);
  const { minPrice, maxPrice } = priceBucketToRange(query.price);

  let unavailable = false;
  const [allResult, filteredResult] = await Promise.allSettled([
    // Unfiltered fetch backs the dropdown option lists — filtering must
    // not shrink the universe of choices out from under the user.
    searchCatalogArtworks(),
    searchCatalogArtworks({
      q: query.q,
      style: query.style,
      color: query.color,
      orientation: query.orientation,
      edition: query.edition,
      availability: query.availability,
      minPrice,
      maxPrice,
    }),
  ]);

  const allArtworks = allResult.status === "fulfilled" ? allResult.value.items : [];
  const filtered = filteredResult.status === "fulfilled" ? filteredResult.value.items : [];
  if (allResult.status === "rejected" || filteredResult.status === "rejected") unavailable = true;

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

      <div className="mt-8">
        <FilterableArtworks
          results={filtered}
          allArtworks={allArtworks}
          query={query}
          unavailable={unavailable}
        />
      </div>
    </PageContainer>
  );
}
