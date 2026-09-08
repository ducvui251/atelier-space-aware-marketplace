import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { DualViewToggle } from "@/components/discovery/DualViewToggle";
import { FilterableArtworks } from "@/components/discovery/FilterableArtworks";
import { listArtworks } from "@/lib/gateway/clients/artwork.client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Artworks",
  description:
    "Browse original and limited-edition artworks filtered by style, color, medium, price, size, orientation, and room.",
};

interface ArtworksPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function toSelection(searchParams: Record<string, string | string[] | undefined>) {
  const selection: { style?: string[]; color?: string[]; orientation?: string[]; edition?: string[]; price?: string[] } = {};
  for (const key of ["style", "color", "orientation", "edition", "price"] as const) {
    const value = searchParams[key];
    if (typeof value === "string" && value.trim()) selection[key] = [value.trim()];
    else if (Array.isArray(value) && value.length > 0) selection[key] = value.filter((v) => v.trim());
  }
  return selection;
}

export default async function ArtworksPage({ searchParams }: ArtworksPageProps) {
  const params = await searchParams;
  const artworks = await listArtworks().catch(() => []);

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
        <FilterableArtworks artworks={artworks} initialSelection={toSelection(params)} />
      </div>
    </PageContainer>
  );
}
