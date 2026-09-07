import { requestService } from "../http-client";

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
