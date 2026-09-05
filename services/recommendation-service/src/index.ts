import type { ServiceDefinition } from "@atelier/contracts";
export { getRecommendations } from "./application/recommendations";
export type { RecommendationResult, RecommendationSignals } from "./application/recommendations";
export { health } from "./health";
export { follows, savedArtworks } from "./infrastructure/signals";
export { toggleArtistFollow, toggleSavedArtwork } from "./application/saved-signals";

export const RECOMMENDATION_SERVICE: ServiceDefinition = {
  name: "recommendation",
  version: "v1",
  owns: ["taste-signals", "ranking", "recommendation-results"],
};
