import type { Artwork } from "@/types";
import type { DbState } from "@/lib/store/db";

export interface RecommendationResult {
  items: Artwork[];
  reason: "personalized" | "curated";
}

/**
 * Lightweight tag-overlap recommender: scores available artworks by how many
 * style/color tags they share with the buyer's saved works and followed
 * artists. Falls back to a curated (verified) list when there isn't enough
 * signal yet — mirrors the doc's "chưa đủ tín hiệu → curated recommendations"
 * exception flow.
 */
export function getRecommendations(
  db: DbState,
  buyerId: string | null,
  limit = 6,
): RecommendationResult {
  const curated = db.artworks
    .filter((a) => a.verificationStatus === "verified" && a.availability === "available")
    .slice(0, limit);

  if (!buyerId) return { items: curated, reason: "curated" };

  const savedArtworkIds = new Set(
    db.savedArtworks.filter((s) => s.buyerId === buyerId).map((s) => s.artworkId),
  );
  const followedArtistIds = new Set(
    db.follows.filter((f) => f.buyerId === buyerId).map((f) => f.artistId),
  );

  if (savedArtworkIds.size === 0 && followedArtistIds.size === 0) {
    return { items: curated, reason: "curated" };
  }

  const signalTags = new Map<string, number>();
  for (const artwork of db.artworks) {
    if (!savedArtworkIds.has(artwork.id)) continue;
    for (const tag of [...artwork.style, ...artwork.dominantColors]) {
      signalTags.set(tag, (signalTags.get(tag) ?? 0) + 1);
    }
  }

  const scored = db.artworks
    .filter(
      (a) =>
        a.availability === "available" &&
        !savedArtworkIds.has(a.id) &&
        a.verificationStatus !== "rejected",
    )
    .map((artwork) => {
      const tagScore = [...artwork.style, ...artwork.dominantColors].reduce(
        (sum, tag) => sum + (signalTags.get(tag) ?? 0),
        0,
      );
      const followBonus = followedArtistIds.has(artwork.artistId) ? 2 : 0;
      return { artwork, score: tagScore + followBonus };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.artwork);

  if (scored.length === 0) return { items: curated, reason: "curated" };

  return { items: scored, reason: "personalized" };
}
