import type { ServiceDefinition } from "@atelier/contracts";
export { discoverArtworks } from "./application/discovery.ts";
export type { ArtworkSearchFilters } from "./transport/v1.ts";
export { health } from "./health.ts";

export const CATALOG_DISCOVERY_SERVICE: ServiceDefinition = {
  name: "catalog-discovery",
  version: "v1",
  owns: ["catalog-read-model", "search-index", "filters", "tags", "open-access-reference-artworks"],
};

export { discoverArtworks as searchArtworks } from "./application/discovery.ts";
