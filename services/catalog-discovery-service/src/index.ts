import type { ServiceDefinition } from "@atelier/contracts";
export { discoverArtworks } from "./application/discovery";
export type { ArtworkSearchFilters } from "./transport/v1";
export { health } from "./health";

export const CATALOG_DISCOVERY_SERVICE: ServiceDefinition = {
  name: "catalog-discovery",
  version: "v1",
  owns: ["catalog-read-model", "search-index", "filters", "tags"],
};

export { discoverArtworks as searchArtworks } from "./application/discovery";
