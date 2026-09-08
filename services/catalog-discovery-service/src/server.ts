import { createServiceServer, getPort, writeServiceError, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { ArtworkSearchQuerySchema, parseBody, type Artwork } from "@atelier/contracts";
import { ArtworkPublishedPayloadSchema, ArtworkReservedPayloadSchema, ArtworkSoldPayloadSchema, ArtworkVerifiedPayloadSchema } from "@atelier/contracts/events";
import { consumeEvents } from "@atelier/events";
import { ping } from "@atelier/persistence";
import { health } from "./health.ts";
import { searchArtworks } from "./domain/search-rules.ts";
import { listReadModel, syncReadModel, upsertReadModelArtwork } from "./infrastructure/read-model-repository.ts";

async function sourceArtworks(): Promise<Artwork[]> {
  const baseUrl = process.env.ARTIST_ARTWORK_SERVICE_URL ?? "http://localhost:4103";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/artist-artwork/artworks`, {
    headers: process.env.ATELIER_INTERNAL_SERVICE_TOKEN ? { "x-service-token": process.env.ATELIER_INTERNAL_SERVICE_TOKEN } : {},
  });
  if (!response.ok) throw new Error(`Artist artwork service returned ${response.status}`);
  const body = await response.json() as { items?: Artwork[] };
  return body.items ?? [];
}

async function sourceArtwork(id: string): Promise<Artwork | null> {
  const baseUrl = process.env.ARTIST_ARTWORK_SERVICE_URL ?? "http://localhost:4103";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/artist-artwork/artworks/${encodeURIComponent(id)}`, {
    headers: process.env.ATELIER_INTERNAL_SERVICE_TOKEN ? { "x-service-token": process.env.ATELIER_INTERNAL_SERVICE_TOKEN } : {},
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Artist artwork service returned ${response.status}`);
  return (await response.json()) as Artwork;
}

let lastSyncOk = false;

async function runSync(): Promise<void> {
  try {
    await syncReadModel(await sourceArtworks());
    lastSyncOk = true;
  } catch {
    lastSyncOk = false;
  }
}

const artworkIdPayloadSchemas = [ArtworkPublishedPayloadSchema, ArtworkVerifiedPayloadSchema, ArtworkReservedPayloadSchema, ArtworkSoldPayloadSchema];

/**
 * Event-driven fast path: refresh exactly the one artwork the event names,
 * instead of waiting for the next full poll (runSync above, which keeps
 * running on a longer interval as a reconciliation safety net for any
 * event that was missed or never published).
 */
async function handleArtworkEvent(event: { type: string; payload: unknown }): Promise<void> {
  let artworkId: string | undefined;
  for (const schema of artworkIdPayloadSchemas) {
    const parsed = schema.safeParse(event.payload);
    if (parsed.success) { artworkId = parsed.data.artworkId; break; }
  }
  if (!artworkId) return;
  const artwork = await sourceArtwork(artworkId);
  if (artwork) await upsertReadModelArtwork(artwork);
}

const routes: Record<string, ServiceRouteHandler> = {
  "GET /v1/catalog/artworks": async ({ url, response, correlationId }) => {
    const parsed = parseBody(ArtworkSearchQuerySchema, Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field });
    const items = searchArtworks(await listReadModel(), parsed.data);
    return writeServiceJson(response, 200, { items, total: items.length }, correlationId);
  },
};

async function ready() {
  const database = (await ping()) ? ("ok" as const) : ("unavailable" as const);
  const readModelSync = lastSyncOk ? ("ok" as const) : ("unavailable" as const);
  const status = database === "ok" && readModelSync === "ok" ? ("ok" as const) : ("unavailable" as const);
  return { status, dependencies: { database, "read-model-sync": readModelSync } };
}

const server = createServiceServer({ name: "catalog-discovery", version: "v1", port: getPort("CATALOG_DISCOVERY_PORT", 4102), health, ready, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN });

// Events (below) keep the read model fresh within one publish/consume round
// trip. This poll stays on as a reconciliation safety net — e.g. for an
// event published before this consumer ever ran, or the rare double
// failure of both the outbox retry loop and a redelivery.
const syncIntervalMs = Number(process.env.CATALOG_SYNC_INTERVAL_MS ?? 60_000);
runSync().finally(() => setInterval(runSync, syncIntervalMs));

if (process.env.EVENT_BROKER_URL) {
  consumeEvents({
    brokerUrl: process.env.EVENT_BROKER_URL,
    exchange: process.env.EVENT_EXCHANGE ?? "atelier.events.v1",
    queue: "atelier.catalog-discovery.v1",
    routingKeys: ["artwork.published", "artwork.verified", "artwork.reserved", "artwork.sold"],
    dedupSchema: "catalog_discovery",
    handler: handleArtworkEvent,
  }).catch(() => undefined);
}

server.listen(getPort("CATALOG_DISCOVERY_PORT", 4102));
