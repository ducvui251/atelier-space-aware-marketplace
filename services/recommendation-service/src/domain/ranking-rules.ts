import type { Artwork } from "@atelier/contracts";

export interface RecommendationSignals {
  artworks: readonly Artwork[];
  savedArtworkIds: ReadonlySet<string>;
  followedArtistIds: ReadonlySet<string>;
}

export interface RecommendationResult { items: Artwork[]; reason: "personalized" | "curated"; }

export function rankRecommendations(data: RecommendationSignals, limit = 6): RecommendationResult {
  const curated = data.artworks.filter((artwork) => artwork.verificationStatus === "verified" && artwork.availability === "available").slice(0, limit);
  if (data.savedArtworkIds.size === 0 && data.followedArtistIds.size === 0) return { items: curated, reason: "curated" };
  const signalTags = new Map<string, number>();
  for (const artwork of data.artworks) {
    if (!data.savedArtworkIds.has(artwork.id)) continue;
    for (const tag of [...artwork.style, ...artwork.dominantColors]) signalTags.set(tag, (signalTags.get(tag) ?? 0) + 1);
  }
  const scored = data.artworks
    .filter((artwork) => artwork.availability === "available" && !data.savedArtworkIds.has(artwork.id) && artwork.verificationStatus !== "rejected")
    .map((artwork) => ({ artwork, score: [...artwork.style, ...artwork.dominantColors].reduce((sum, tag) => sum + (signalTags.get(tag) ?? 0), 0) + (data.followedArtistIds.has(artwork.artistId) ? 2 : 0) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.artwork);
  return scored.length > 0 ? { items: scored, reason: "personalized" } : { items: curated, reason: "curated" };
}
