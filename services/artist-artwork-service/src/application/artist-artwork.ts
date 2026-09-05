import type { Artist, Artwork, Availability } from "@atelier/contracts";
import { getArtistById, getArtists, getArtworkById, getArtworks, getFeaturedArtworks, updateAvailability } from "../domain/artwork-rules";

export { getArtistById, getArtists, getArtworkById, getArtworks, getFeaturedArtworks };
export function setArtworkAvailability(artwork: Artwork, availability: Availability): Artwork { return updateAvailability(artwork, availability); }
export function getArtistArtworks(artworks: readonly Artwork[], artistId: string): Artwork[] { return artworks.filter((artwork) => artwork.artistId === artistId); }
