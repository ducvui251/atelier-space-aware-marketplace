import type { Follow, SavedArtwork } from "@atelier/contracts";

export function toggleSavedArtwork(items: readonly SavedArtwork[], buyerId: string, artworkId: string): { saved: boolean; items: SavedArtwork[] } {
  const existing = items.find((item) => item.buyerId === buyerId && item.artworkId === artworkId);
  if (existing) return { saved: false, items: items.filter((item) => item.id !== existing.id) };
  return { saved: true, items: [...items, { id: `saved-${crypto.randomUUID()}`, buyerId, artworkId }] };
}

export function toggleArtistFollow(items: readonly Follow[], buyerId: string, artistId: string): { following: boolean; items: Follow[] } {
  const existing = items.find((item) => item.buyerId === buyerId && item.artistId === artistId);
  if (existing) return { following: false, items: items.filter((item) => item.id !== existing.id) };
  return { following: true, items: [...items, { id: `follow-${crypto.randomUUID()}`, buyerId, artistId }] };
}
