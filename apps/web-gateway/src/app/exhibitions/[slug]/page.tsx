import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Artwork } from "@atelier/contracts";
import { ExhibitionLandingClient } from "@/components/exhibitions/ExhibitionLandingClient";
import { findExhibitionBySlug, listExhibitionPlacements } from "@/lib/gateway/clients/exhibition.client";
import { findArtist, findArtwork } from "@/lib/gateway/clients/artwork.client";
import type { PlacedArtwork } from "@/components/spatial/exhibition/ExhibitionLiveScene";

interface ExhibitionPageProps {
  params: Promise<{ slug: string }>;
}

// Exhibition data is service-backed and can change (publish/unpublish,
// placements edited), so this can't be statically prerendered.
export const dynamic = "force-dynamic";

async function loadPublishedExhibition(slug: string) {
  const exhibition = await findExhibitionBySlug(slug);
  if (!exhibition || exhibition.status !== "published") return null;
  return exhibition;
}

export async function generateMetadata({ params }: ExhibitionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const exhibition = await loadPublishedExhibition(slug);
  return {
    title: exhibition ? exhibition.title : "Exhibition",
    description: exhibition?.description,
  };
}

export default async function ExhibitionPage({ params }: ExhibitionPageProps) {
  const { slug } = await params;
  const exhibition = await loadPublishedExhibition(slug);
  if (!exhibition) notFound();

  const placements = await listExhibitionPlacements(exhibition.id);
  // A public exhibition should still open when an optional catalog read is
  // temporarily unavailable; uploaded scene images do not depend on it.
  const artworks = await Promise.all(placements.map(async (placement) => {
    try {
      return await findArtwork(placement.artworkId);
    } catch {
      return null;
    }
  }));
  const placedArtworks: PlacedArtwork[] = placements
    .map((placement, index) => ({ placement, artwork: artworks[index] }))
    .filter((entry): entry is { placement: (typeof placements)[number]; artwork: Artwork } => entry.artwork !== null);

  const creator = exhibition.creatorType === "admin" ? null : await findArtist(exhibition.creatorId).catch(() => null);
  const creatorName = exhibition.creatorType === "admin" ? "Atelier" : (creator?.displayName ?? "An Atelier artist");

  return <ExhibitionLandingClient exhibition={exhibition} creatorName={creatorName} placedArtworks={placedArtworks} />;
}
