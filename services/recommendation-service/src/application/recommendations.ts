import { rankRecommendations, type RecommendationResult, type RecommendationSignals } from "../domain/ranking-rules";
export type { RecommendationResult, RecommendationSignals };
export function getRecommendations(data: RecommendationSignals, limit = 6): RecommendationResult { return rankRecommendations(data, limit); }
