import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { ExhibitionDemoSceneLoader } from "@/components/spatial/ExhibitionDemoSceneLoader";
import { listArtworks } from "@/lib/gateway/clients/artwork.client";
import type { Artwork } from "@/types";
import { isDisplayableImageUrl } from "@/lib/image-hosts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "3D Exhibition Spike",
  description: "Walkable gallery MVP for the 3D exhibition renderer.",
};

function pickExhibitionArtworks(artworks: Artwork[]): Artwork[] {
  const displayable = artworks.filter((artwork) => isDisplayableImageUrl(artwork.imageUrl));
  const available = displayable.filter((artwork) => artwork.availability === "available");
  const unavailable = displayable.filter((artwork) => artwork.availability !== "available");
  const picked = [...available.slice(0, 2), ...unavailable.slice(0, 1)];
  const pickedIds = new Set(picked.map((artwork) => artwork.id));
  for (const artwork of displayable) {
    if (picked.length >= 3) break;
    if (!pickedIds.has(artwork.id)) picked.push(artwork);
  }
  return picked.slice(0, 3);
}

export default async function ExhibitionDemoPage() {
  const artworks = await listArtworks().catch(() => [] as Artwork[]);
  const exhibitionArtworks = pickExhibitionArtworks(artworks);

  return (
    <PageContainer className="py-10">
      <div>
        <p className="eyebrow">Walkable gallery MVP</p>
        <h1 className="mt-2 font-display text-h1 text-foreground">3D Exhibition Renderer</h1>
        <p className="mt-3 max-w-2xl text-body text-muted-foreground">
          Internal-only preview of a procedural gallery room with real artwork images and
          dimensions. Click the scene to look around, use WASD to walk, and click a highlighted
          artwork to see its details.
        </p>
      </div>
      <div className="mt-6">
        <ExhibitionDemoSceneLoader artworks={exhibitionArtworks} />
      </div>
    </PageContainer>
  );
}
