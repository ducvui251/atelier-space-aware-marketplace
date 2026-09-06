import { createServiceServer, getPort, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import type { Artwork } from "@atelier/contracts";
import { ArtworkSearchQuerySchema } from "@atelier/contracts";
import { health } from "./health.ts";
import { searchArtworks } from "./domain/search-rules.ts";

async function sourceArtworks(): Promise<Artwork[]> {
  const baseUrl = process.env.ARTIST_ARTWORK_SERVICE_URL ?? "http://localhost:4103";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/artist-artwork/artworks`, {
    headers: process.env.ATELIER_INTERNAL_SERVICE_TOKEN ? { "x-service-token": process.env.ATELIER_INTERNAL_SERVICE_TOKEN } : {},
  });
  if (!response.ok) throw new Error(`Artist artwork service returned ${response.status}`);
  const body = await response.json() as { items?: Artwork[] };
  return body.items ?? [];
}

const routes: Record<string, ServiceRouteHandler> = {
  "GET /v1/catalog/artworks": async ({ url, response, correlationId }) => {
    const filters = ArtworkSearchQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
    const items = searchArtworks(await sourceArtworks(), filters);
    return writeServiceJson(response, 200, { items, total: items.length }, correlationId);
  },
};

createServiceServer({ name: "catalog-discovery", version: "v1", port: getPort("CATALOG_DISCOVERY_PORT", 4102), health, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("CATALOG_DISCOVERY_PORT", 4102));
