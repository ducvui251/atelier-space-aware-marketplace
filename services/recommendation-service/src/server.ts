import { createServiceServer, getPort, readJson, writeServiceError, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { requestInternalService } from "@atelier/config/service-client";
import { ArtistArtworkViewsQuerySchema, ArtistArtworkViewsResponseSchema, ArtistAudienceQuerySchema, ArtworkViewRequestSchema, RecordArtworkViewResponseSchema, ToggleFollowRequestSchema, ToggleSavedRequestSchema, parseBody, type Artwork } from "@atelier/contracts";
import { ping } from "@atelier/persistence";
import { health } from "./health.ts";
import { getRecommendations } from "./application/recommendations.ts";
import { getArtistArtworkSaves, getArtistArtworkViews, getArtistAudience, getSignals, listFollowedArtistIds, listSavedArtworkIds, recordArtworkView, toggleFollow, toggleSaved } from "./infrastructure/recommendation-repository.ts";

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
    if (!buyerId) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "buyerId is required", correlationId, field: "buyerId", retryable: false });
    const ids = new Set(await listSavedArtworkIds(buyerId));
    const items = (await sourceArtworks()).filter((artwork) => ids.has(artwork.id));
    return writeServiceJson(response, 200, { items, total: items.length }, correlationId);
  },
  "POST /v1/recommendation/saved": async ({ request, response, correlationId }) => {
    const parsed = parseBody(ToggleSavedRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    return writeServiceJson(response, 200, { saved: await toggleSaved(parsed.data.buyerId, parsed.data.artworkId) }, correlationId);
  },
  "GET /v1/recommendation/follows": async ({ url, response, correlationId }) => {
    const buyerId = url.searchParams.get("buyerId");
    if (!buyerId) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "buyerId is required", correlationId, field: "buyerId", retryable: false });
    const artistIds = await listFollowedArtistIds(buyerId);
    return writeServiceJson(response, 200, { artistIds, total: artistIds.length }, correlationId);
  },
  "POST /v1/recommendation/follows": async ({ request, response, correlationId }) => {
    const parsed = parseBody(ToggleFollowRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    return writeServiceJson(response, 200, { following: await toggleFollow(parsed.data.buyerId, parsed.data.artistId) }, correlationId);
  },
  "GET /v1/recommendation/artist-audience": async ({ url, response, correlationId }) => {
    const artistId = url.searchParams.get("artistId");
    if (!artistId) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "artistId is required", correlationId, field: "artistId", retryable: false });
    const parsed = parseBody(ArtistAudienceQuerySchema, Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const audience = await getArtistAudience(artistId, parsed.data.periodDays);
    return writeServiceJson(response, 200, { artistId, periodDays: parsed.data.periodDays, ...audience }, correlationId);
  },
  "GET /v1/recommendation/artist-saves": async ({ url, response, correlationId }) => {
    const artistId = url.searchParams.get("artistId");
    if (!artistId) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "artistId is required", correlationId, field: "artistId", retryable: false });
    const { items: artworks } = await requestInternalService<{ items: { id: string }[] }>(
      "artist-artwork",
      `/v1/artist-artwork/artist/artworks?artistId=${encodeURIComponent(artistId)}`,
      { correlationId },
    );
    const items = await getArtistArtworkSaves(artworks.map((a) => a.id));
    return writeServiceJson(response, 200, { items, total: items.length }, correlationId);
  },
  "POST /v1/recommendation/artwork-views": async ({ request, response, correlationId }) => {
    const parsed = parseBody(ArtworkViewRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const recorded = await recordArtworkView(parsed.data);
    return writeServiceJson(response, 200, RecordArtworkViewResponseSchema.parse({ recorded }), correlationId);
  },
  "GET /v1/recommendation/artist-views": async ({ url, response, correlationId }) => {
    const parsed = parseBody(ArtistArtworkViewsQuerySchema, Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const { artistId, from, to } = parsed.data;
    const { items: artworks } = await requestInternalService<{ items: { id: string }[] }>(
      "artist-artwork",
      `/v1/artist-artwork/artist/artworks?artistId=${encodeURIComponent(artistId)}`,
      { correlationId },
    );
    const counts = await getArtistArtworkViews(artworks.map((artwork) => artwork.id), from, to);
    const viewsByArtwork = new Map(counts.map((count) => [count.artworkId, count.views]));
    const items = artworks.map((artwork) => ({ artworkId: artwork.id, views: viewsByArtwork.get(artwork.id) ?? 0 }));
    const result = ArtistArtworkViewsResponseSchema.parse({ artistId, from, to, items, totalViews: items.reduce((total, item) => total + item.views, 0) });
    return writeServiceJson(response, 200, result, correlationId);
  },
};

async function ready() {
  const database = (await ping()) ? ("ok" as const) : ("unavailable" as const);
  return { status: database, dependencies: { database } };
}

createServiceServer({ name: "recommendation", version: "v1", port: getPort("RECOMMENDATION_PORT", 4105), health, ready, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("RECOMMENDATION_PORT", 4105));
