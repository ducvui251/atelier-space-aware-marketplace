import { createServiceServer, getPort, readJson, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { health } from "./health.ts";
import { getRecommendations } from "./application/recommendations.ts";
import { getSignals, listSavedArtworkIds, toggleFollow, toggleSaved } from "./infrastructure/recommendation-repository.ts";
import type { Artwork } from "@atelier/contracts";

async function sourceArtworks(): Promise<Artwork[]> {
  const baseUrl = process.env.ARTIST_ARTWORK_SERVICE_URL ?? "http://localhost:4103";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/artist-artwork/artworks`, {
    headers: process.env.ATELIER_INTERNAL_SERVICE_TOKEN ? { "x-service-token": process.env.ATELIER_INTERNAL_SERVICE_TOKEN } : {},
  });
  if (!response.ok) throw new Error(`Artist artwork service returned ${response.status}`);
  return ((await response.json()) as { items?: Artwork[] }).items ?? [];
}

const routes: Record<string, ServiceRouteHandler> = {
  "GET /v1/recommendation/recommendations": async ({ url, response, correlationId }) => {
    const buyerId = url.searchParams.get("buyerId");
    const signals = buyerId ? await getSignals(buyerId) : { savedArtworkIds: new Set<string>(), followedArtistIds: new Set<string>() };
    return writeServiceJson(response, 200, getRecommendations({ artworks: await sourceArtworks(), ...signals }), correlationId);
  },
  "GET /v1/recommendation/saved": async ({ url, response, correlationId }) => {
    const buyerId = url.searchParams.get("buyerId");
    if (!buyerId) return writeServiceJson(response, 400, { error: "buyerId is required" }, correlationId);
    const ids = new Set(await listSavedArtworkIds(buyerId));
    const items = (await sourceArtworks()).filter((artwork) => ids.has(artwork.id));
    return writeServiceJson(response, 200, { items, total: items.length }, correlationId);
  },
  "POST /v1/recommendation/saved": async ({ request, response, correlationId }) => {
    const body = await readJson<{ buyerId?: string; artworkId?: string }>(request);
    if (!body?.buyerId || !body.artworkId) return writeServiceJson(response, 400, { error: "buyerId and artworkId are required" }, correlationId);
    return writeServiceJson(response, 200, { saved: await toggleSaved(body.buyerId, body.artworkId) }, correlationId);
  },
  "POST /v1/recommendation/follows": async ({ request, response, correlationId }) => {
    const body = await readJson<{ buyerId?: string; artistId?: string }>(request);
    if (!body?.buyerId || !body.artistId) return writeServiceJson(response, 400, { error: "buyerId and artistId are required" }, correlationId);
    return writeServiceJson(response, 200, { following: await toggleFollow(body.buyerId, body.artistId) }, correlationId);
  },
};

createServiceServer({ name: "recommendation", version: "v1", port: getPort("RECOMMENDATION_PORT", 4105), health, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("RECOMMENDATION_PORT", 4105));
