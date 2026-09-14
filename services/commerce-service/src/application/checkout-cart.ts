export function resolveCartArtworks<T extends { id: string }>(artworkIds: string[], sourceArtworks: T[]) {
  const artworksById = new Map(sourceArtworks.map((artwork) => [artwork.id, artwork]));
  const items = artworkIds.flatMap((id) => {
    const artwork = artworksById.get(id);
    return artwork ? [artwork] : [];
  });
  const missingArtworkIds = artworkIds.filter((id) => !artworksById.has(id));

  return { items, missingArtworkIds };
}
