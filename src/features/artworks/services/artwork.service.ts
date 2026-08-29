import { artworks } from "@/data";
import type { Artwork } from "@/types";

/**
 * Artwork service — data-access boundary for the app surface.
 *
 * Today these functions read from the centralized mock dataset. They are kept
 * async so the underlying source can later become Supabase/PostgreSQL without
 * changing how page and component consumers call them.
 */
export async function getArtworkById(id: string): Promise<Artwork | undefined> {
  return artworks.find((artwork) => artwork.id === id);
}

export async function getArtworks(): Promise<Artwork[]> {
  return artworks;
}

export async function getFeaturedArtworks(): Promise<Artwork[]> {
  return artworks.slice(0, 6);
}
