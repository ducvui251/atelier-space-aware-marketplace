import type { Artist, Artwork } from "@atelier/contracts";
import { requestService, ServiceClientError } from "../http-client";

interface ListResponse<T> { items: T[]; total: number; }

export async function listArtworks(): Promise<Artwork[]> {
  const result = await requestService<ListResponse<Artwork>>("artist-artwork", "/v1/artist-artwork/artworks");
  return result.items;
}

export async function listFeaturedArtworks(): Promise<Artwork[]> { return (await listArtworks()).slice(0, 6); }
export async function findArtwork(id: string): Promise<Artwork | null> {
  try { return await requestService<Artwork>("artist-artwork", `/v1/artist-artwork/artworks/${encodeURIComponent(id)}`); } catch (error) { if (error instanceof ServiceClientError && error.status === 404) return null; throw error; }
}
export async function listArtists(): Promise<Artist[]> {
  const result = await requestService<ListResponse<Artist>>("artist-artwork", "/v1/artist-artwork/artists");
  return result.items;
}
export async function findArtist(id: string): Promise<Artist | null> {
  try { return await requestService<Artist>("artist-artwork", `/v1/artist-artwork/artists/${encodeURIComponent(id)}`); } catch (error) { if (error instanceof ServiceClientError && error.status === 404) return null; throw error; }
}

export async function listArtistArtworks(artistId: string) {
  return requestService<{ items: Artwork[]; total?: number }>("artist-artwork", `/v1/artist-artwork/artist/artworks?artistId=${encodeURIComponent(artistId)}`);
}

export async function createArtwork(input: Record<string, unknown>) {
  return requestService<Artwork>("artist-artwork", "/v1/artist-artwork/artworks", { method: "POST", body: input });
}

export async function updateArtwork(id: string, input: Record<string, unknown>) {
  return requestService<Artwork>("artist-artwork", `/v1/artist-artwork/artworks/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
}
