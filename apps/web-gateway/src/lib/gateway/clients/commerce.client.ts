import type { ArtistEarnings, ArtworkSaleCount } from "@atelier/contracts";
import { requestService } from "../http-client";

export function getArtistEarnings(artistId: string, query: { period?: string; from?: string; to?: string }, timeoutMs: number, correlationId?: string) {
  const params = new URLSearchParams({ artistId, ...(query.period ? { period: query.period } : {}), ...(query.from ? { from: query.from } : {}), ...(query.to ? { to: query.to } : {}) });
  return requestService<ArtistEarnings>("commerce", `/v1/commerce/artist-earnings?${params}`, { timeoutMs, correlationId });
}

export function getArtistTopArtworks(artistId: string, query: { from?: string; to?: string; limit?: number }, timeoutMs: number, correlationId?: string) {
  const params = new URLSearchParams({ artistId, ...(query.from ? { from: query.from } : {}), ...(query.to ? { to: query.to } : {}), ...(query.limit ? { limit: String(query.limit) } : {}) });
  return requestService<{ items: ArtworkSaleCount[]; total: number }>("commerce", `/v1/commerce/artist-top-artworks?${params}`, { timeoutMs, correlationId });
}

export async function getCart(authUserId: string) {
  return requestService<{ artworkIds: string[] }>("commerce", `/v1/commerce/cart?buyerId=${encodeURIComponent(authUserId)}`);
}

export async function addCartItem(authUserId: string, artworkId: string) {
  return requestService<{ artworkIds: string[] }>("commerce", "/v1/commerce/cart", { method: "POST", body: { buyerId: authUserId, artworkId } });
}

export async function removeCartItem(authUserId: string, artworkId: string) {
  return requestService<{ artworkIds: string[] }>("commerce", `/v1/commerce/cart/${encodeURIComponent(artworkId)}?buyerId=${encodeURIComponent(authUserId)}`, { method: "DELETE" });
}
