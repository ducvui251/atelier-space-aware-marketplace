import type { ServiceDefinition } from "@atelier/contracts";
export { getArtistById, getArtists, getArtworkById, getArtworks, getFeaturedArtworks, getArtistArtworks, setArtworkAvailability } from "./application/artist-artwork.ts";
export { health } from "./health.ts";

export const ARTIST_ARTWORK_SERVICE: ServiceDefinition = {
  name: "artist-artwork",
  version: "v1",
  owns: ["artists", "artworks", "editions", "inventory"],
};
