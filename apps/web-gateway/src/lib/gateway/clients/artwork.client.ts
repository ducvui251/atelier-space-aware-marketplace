import { PublicDomainArtworkPageResponseSchema, type Artist, type Artwork, type ArtworkSearchQuery, type PublicDomainArtworkPageQuery, type PublicDomainArtworkPageResponse } from "@atelier/contracts";
import { requestService, ServiceClientError } from "../http-client";

interface ListResponse<T> { items: T[]; total: number; }

export async function listArtworks(): Promise<Artwork[]> {
  const result = await requestService<ListResponse<Artwork>>("artist-artwork", "/v1/artist-artwork/artworks");
  return result.items;
}

/**
 * The public catalog's actual read path (§3.2/§4.1 of the defect audit):
 * Catalog & Discovery's read model, which is verified-only and kept fresh
 * by events (see catalog-discovery-service). listArtworks() above talks to
 * Artist & Artwork directly and stays in use elsewhere (related-artwork
 * rails, room preview, artist profile) — narrowing every one of those
 * call sites onto Catalog & Discovery is a separate pass, not this one.
 */
export async function searchCatalogArtworks(query: Partial<ArtworkSearchQuery> = {}): Promise<ListResponse<Artwork>> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return requestService<ListResponse<Artwork>>("catalog-discovery", `/v1/catalog/artworks${qs ? `?${qs}` : ""}`);
}

export async function listFeaturedArtworks(): Promise<Artwork[]> { return (await listArtworks()).slice(0, 6); }
export async function findArtwork(id: string, options: { timeoutMs?: number; correlationId?: string } = {}): Promise<Artwork | null> {
  try { return await requestService<Artwork>("artist-artwork", `/v1/artist-artwork/artworks/${encodeURIComponent(id)}`, options); } catch (error) { if (error instanceof ServiceClientError && error.status === 404) return null; throw error; }
}
export async function listArtists(): Promise<Artist[]> {
  const result = await requestService<ListResponse<Artist>>("artist-artwork", "/v1/artist-artwork/artists");
  return result.items;
}
export async function findArtist(id: string): Promise<Artist | null> {
  try { return await requestService<Artist>("artist-artwork", `/v1/artist-artwork/artists/${encodeURIComponent(id)}`); } catch (error) { if (error instanceof ServiceClientError && error.status === 404) return null; throw error; }
}

export async function listArtistArtworks(artistId: string, options: { timeoutMs?: number; correlationId?: string } = {}) {
  return requestService<{ items: Artwork[]; total?: number }>("artist-artwork", `/v1/artist-artwork/artist/artworks?artistId=${encodeURIComponent(artistId)}`, options);
}

export async function listPublicDomainArtworks(query: PublicDomainArtworkPageQuery): Promise<PublicDomainArtworkPageResponse> {
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) });
  const response = await requestService<unknown>("catalog-discovery", `/v1/catalog/reference-artworks?${params}`);
  return PublicDomainArtworkPageResponseSchema.parse(response);
}

export async function createArtwork(input: Record<string, unknown>) {
  return requestService<Artwork>("artist-artwork", "/v1/artist-artwork/artworks", { method: "POST", body: input });
}

export async function updateArtwork(id: string, input: Record<string, unknown>) {
  return requestService<Artwork>("artist-artwork", `/v1/artist-artwork/artworks/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
}
