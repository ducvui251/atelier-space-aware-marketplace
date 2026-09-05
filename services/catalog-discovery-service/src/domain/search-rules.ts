import type { Artwork } from "@atelier/contracts";
import type { ArtworkSearchFilters } from "../transport/v1";

export function searchArtworks(artworks: readonly Artwork[], filters: ArtworkSearchFilters): Artwork[] {
  let result = [...artworks];
  const q = filters.q?.toLowerCase();
  if (q) result = result.filter((artwork) => [artwork.title, artwork.artist, artwork.medium, ...artwork.style, ...artwork.dominantColors].join(" ").toLowerCase().includes(q));
  const style = filters.style;
  const color = filters.color;
  if (style) result = result.filter((artwork) => artwork.style.includes(style));
  if (color) result = result.filter((artwork) => artwork.dominantColors.includes(color));
  if (filters.orientation) result = result.filter((artwork) => artwork.orientation === filters.orientation);
  if (filters.edition) result = result.filter((artwork) => artwork.editionType === filters.edition);
  if (filters.availability) result = result.filter((artwork) => artwork.availability === filters.availability);
  const minPrice = filters.minPrice;
  const maxPrice = filters.maxPrice;
  if (minPrice !== undefined) result = result.filter((artwork) => artwork.price >= minPrice);
  if (maxPrice !== undefined) result = result.filter((artwork) => artwork.price <= maxPrice);
  return result;
}
