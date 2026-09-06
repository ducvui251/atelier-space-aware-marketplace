import type { DbState } from "@/lib/store/db";
import { getRecommendations } from "@atelier/recommendation-service";
import { requestService } from "../http-client";

export function getGatewayRecommendations(db: Pick<DbState, "artworks" | "savedArtworks" | "follows">, buyerId: string | null, limit = 6) {
  return getRecommendations({
    artworks: db.artworks,
    savedArtworkIds: new Set(db.savedArtworks.filter((item) => item.buyerId === buyerId).map((item) => item.artworkId)),
    followedArtistIds: new Set(db.follows.filter((item) => item.buyerId === buyerId).map((item) => item.artistId)),
  }, limit);
}

export async function getNetworkRecommendations(buyerId: string | null) {
  const query = buyerId ? `?buyerId=${encodeURIComponent(buyerId)}` : "";
  return requestService<{ items: unknown[]; reason: "personalized" | "curated" }>("recommendation", `/v1/recommendation/recommendations${query}`);
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
