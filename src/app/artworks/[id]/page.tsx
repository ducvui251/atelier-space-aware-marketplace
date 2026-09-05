import type { Metadata } from "next";
import { ArtworkDetailClient } from "@/components/artwork/ArtworkDetailClient";
import {
  getArtworkById,
  getArtworks,
} from "@/features/artworks/services/artwork.service";

interface ArtworkDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const artworks = await getArtworks();
  return artworks.map((artwork) => ({ id: artwork.id }));
}

export async function generateMetadata({
  params,
}: ArtworkDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const artwork = await getArtworkById(id);
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
  return <ArtworkDetailClient id={id} />;
}
