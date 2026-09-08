import type { ServiceDefinition } from "@atelier/contracts";
export { getRecommendations } from "./application/recommendations.ts";
export type { RecommendationResult, RecommendationSignals } from "./application/recommendations.ts";
export { health } from "./health.ts";
export { toggleArtistFollow, toggleSavedArtwork } from "./application/saved-signals.ts";

export const RECOMMENDATION_SERVICE: ServiceDefinition = {
  name: "recommendation",
  version: "v1",
  owns: ["taste-signals", "ranking", "recommendation-results"],
};
