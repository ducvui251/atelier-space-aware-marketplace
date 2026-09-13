import type { ArtistArtworkViews, ArtistAudience, ArtworkSaveCount } from "@atelier/contracts";
import { requestService } from "../http-client";

export function getArtistAudience(artistId: string, periodDays: number, timeoutMs: number, correlationId?: string) {
  return requestService<ArtistAudience>("recommendation", `/v1/recommendation/artist-audience?artistId=${encodeURIComponent(artistId)}&periodDays=${periodDays}`, { timeoutMs, correlationId });
}

export function getArtistSaves(artistId: string, timeoutMs: number, correlationId?: string) {
  return requestService<{ items: ArtworkSaveCount[]; total: number }>("recommendation", `/v1/recommendation/artist-saves?artistId=${encodeURIComponent(artistId)}`, { timeoutMs, correlationId });
}

export function getArtistViews(artistId: string, query: { from: string; to: string }, timeoutMs: number, correlationId?: string) {
  const params = new URLSearchParams({ artistId, from: query.from, to: query.to });
  return requestService<ArtistArtworkViews>("recommendation", `/v1/recommendation/artist-views?${params}`, { timeoutMs, correlationId });
}

export function recordArtworkView(input: { artworkId: string; viewedOn: string; viewerHash: string }, timeoutMs: number, correlationId?: string) {
  return requestService<{ recorded: boolean }>("recommendation", "/v1/recommendation/artwork-views", { method: "POST", body: input, timeoutMs, correlationId });
}

export async function getNetworkRecommendations(buyerId: string | null) {
  const query = buyerId ? `?buyerId=${encodeURIComponent(buyerId)}` : "";
  return requestService<{ items: unknown[]; reason: "personalized" | "curated" }>("recommendation", `/v1/recommendation/recommendations${query}`);
}

export async function getNetworkFollows(buyerId: string) {
  return requestService<{ artistIds: string[]; total: number }>("recommendation", `/v1/recommendation/follows?buyerId=${encodeURIComponent(buyerId)}`);
}

export async function getNetworkSaved(buyerId: string) {
  return requestService<{ items: unknown[]; total: number }>("recommendation", `/v1/recommendation/saved?buyerId=${encodeURIComponent(buyerId)}`);
}

export async function toggleNetworkSaved(buyerId: string, artworkId: string) {
  return requestService<{ saved: boolean }>("recommendation", "/v1/recommendation/saved", { method: "POST", body: { buyerId, artworkId } });
}

export async function toggleNetworkFollow(buyerId: string, artistId: string) {
  return requestService<{ following: boolean }>("recommendation", "/v1/recommendation/follows", { method: "POST", body: { buyerId, artistId } });
}
