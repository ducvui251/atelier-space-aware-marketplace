import type { Artist, Artwork, Availability } from "@atelier/contracts";

export function getArtworkById(artworks: readonly Artwork[], id: string): Artwork | undefined { return artworks.find((artwork) => artwork.id === id); }
export function getArtworks(artworks: readonly Artwork[]): Artwork[] { return [...artworks]; }
export function getFeaturedArtworks(artworks: readonly Artwork[]): Artwork[] { return artworks.slice(0, 6); }
export function getArtistById(artists: readonly Artist[], id: string): Artist | undefined { return artists.find((artist) => artist.id === id); }
export function getArtists(artists: readonly Artist[]): Artist[] { return [...artists]; }
export function updateAvailability(artwork: Artwork, availability: Availability): Artwork { return { ...artwork, availability }; }
