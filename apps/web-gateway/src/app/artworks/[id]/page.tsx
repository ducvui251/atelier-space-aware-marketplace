import type { Metadata } from "next";
import { ArtworkDetailClient } from "@/components/artwork/ArtworkDetailClient";
import {
  findArtwork,
  listArtworks,
} from "@/lib/gateway/clients/artwork.client";

interface ArtworkDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const artworks = await listArtworks();
  return artworks.map((artwork) => ({ id: artwork.id }));
}

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
  return <ArtworkDetailClient id={id} />;
}
