import type { ServiceDefinition } from "@atelier/contracts";
export { artists } from "./infrastructure/artists";
export { artworks } from "./infrastructure/artworks";
export { getArtistById, getArtists, getArtworkById, getArtworks, getFeaturedArtworks, getArtistArtworks, setArtworkAvailability } from "./application/artist-artwork";
export { health } from "./health";

export const ARTIST_ARTWORK_SERVICE: ServiceDefinition = {
  name: "artist-artwork",
  version: "v1",
  owns: ["artists", "artworks", "editions", "inventory"],
};
