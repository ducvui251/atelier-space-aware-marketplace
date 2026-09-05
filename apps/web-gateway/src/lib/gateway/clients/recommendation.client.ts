import type { DbState } from "@/lib/store/db";
import { getRecommendations } from "@atelier/recommendation-service";

export function getGatewayRecommendations(db: Pick<DbState, "artworks" | "savedArtworks" | "follows">, buyerId: string | null, limit = 6) {
  return getRecommendations({
    artworks: db.artworks,
    savedArtworkIds: new Set(db.savedArtworks.filter((item) => item.buyerId === buyerId).map((item) => item.artworkId)),
    followedArtistIds: new Set(db.follows.filter((item) => item.buyerId === buyerId).map((item) => item.artistId)),
  }, limit);
}
