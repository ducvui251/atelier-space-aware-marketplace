import { createServiceServer, getPort, readJson, writeServiceError, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { ToggleFollowRequestSchema, ToggleSavedRequestSchema, parseBody, type Artwork } from "@atelier/contracts";
import { ping } from "@atelier/persistence";
import { health } from "./health.ts";
import { getRecommendations } from "./application/recommendations.ts";
import { getSignals, listFollowedArtistIds, listSavedArtworkIds, toggleFollow, toggleSaved } from "./infrastructure/recommendation-repository.ts";

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
    if (!buyerId) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "buyerId is required", correlationId, field: "buyerId" });
    const ids = new Set(await listSavedArtworkIds(buyerId));
    const items = (await sourceArtworks()).filter((artwork) => ids.has(artwork.id));
    return writeServiceJson(response, 200, { items, total: items.length }, correlationId);
  },
  "POST /v1/recommendation/saved": async ({ request, response, correlationId }) => {
    const parsed = parseBody(ToggleSavedRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field });
    return writeServiceJson(response, 200, { saved: await toggleSaved(parsed.data.buyerId, parsed.data.artworkId) }, correlationId);
  },
  "GET /v1/recommendation/follows": async ({ url, response, correlationId }) => {
    const buyerId = url.searchParams.get("buyerId");
    if (!buyerId) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "buyerId is required", correlationId, field: "buyerId" });
    const artistIds = await listFollowedArtistIds(buyerId);
    return writeServiceJson(response, 200, { artistIds, total: artistIds.length }, correlationId);
  },
  "POST /v1/recommendation/follows": async ({ request, response, correlationId }) => {
    const parsed = parseBody(ToggleFollowRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field });
    return writeServiceJson(response, 200, { following: await toggleFollow(parsed.data.buyerId, parsed.data.artistId) }, correlationId);
  },
};

async function ready() {
  const database = (await ping()) ? ("ok" as const) : ("unavailable" as const);
  return { status: database, dependencies: { database } };
}

createServiceServer({ name: "recommendation", version: "v1", port: getPort("RECOMMENDATION_PORT", 4105), health, ready, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("RECOMMENDATION_PORT", 4105));
