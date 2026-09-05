import {
  artists,
  artworks,
  getArtistById,
  getArtists,
  getArtworkById,
  getArtworks,
  getFeaturedArtworks,
} from "@atelier/artist-artwork-service";

export async function listArtworks() { return getArtworks(artworks); }
export async function listFeaturedArtworks() { return getFeaturedArtworks(artworks); }
export async function findArtwork(id: string) { return getArtworkById(artworks, id); }
export async function listArtists() { return getArtists(artists); }
export async function findArtist(id: string) { return getArtistById(artists, id); }
