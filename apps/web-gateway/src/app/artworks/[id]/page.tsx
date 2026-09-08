import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtworkDetailClient } from "@/components/artwork/ArtworkDetailClient";
import {
  findArtist,
  findArtwork,
  listArtworks,
} from "@/lib/gateway/clients/artwork.client";

interface ArtworkDetailPageProps {
  params: Promise<{ id: string }>;
}

// Catalog data is service-backed, so prerendering cannot enumerate params
// at build time (the old fixture fallback was removed in Phase 1 of
// MICROSERVICE_100_PLAN.md). Params are resolved per-request instead.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: ArtworkDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const artwork = await findArtwork(id);
  return {
    title: artwork ? artwork.title : "Artwork",
    description: artwork
      ? `${artwork.title} by ${artwork.artist}. ${artwork.medium}.`
      : undefined,
  };
}

export default async function ArtworkDetailPage({
  params,
}: ArtworkDetailPageProps) {
  const { id } = await params;
  const artwork = await findArtwork(id);
  if (!artwork) notFound();

  const artist = await findArtist(artwork.artistId);
  const related = (await listArtworks()).filter(
    (item) =>
      item.id !== artwork.id &&
      item.availability === "available" &&
      item.style.some((style) => artwork.style.includes(style)),
  ).slice(0, 3);

  return <ArtworkDetailClient artwork={artwork} artist={artist} related={related} />;
}
