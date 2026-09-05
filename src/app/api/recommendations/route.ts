import type { NextRequest } from "next/server";
import { getServerDb } from "@/lib/server/store";
import { getAuthUser } from "@/lib/server/auth";
import { json } from "@/lib/server/respond";

const LIMIT = 6;

export async function GET(request: NextRequest) {
  const db = getServerDb();
  const user = getAuthUser(request);

  const curated = db.artworks
    .filter((a) => a.verificationStatus === "verified" && a.availability === "available")
    .slice(0, LIMIT);

  if (!user) return json({ items: curated, reason: "curated" });

  const savedIds = new Set(
    db.savedArtworks.filter((s) => s.buyerId === user.id).map((s) => s.artworkId),
  );
  const followedIds = new Set(db.follows.filter((f) => f.buyerId === user.id).map((f) => f.artistId));

  if (savedIds.size === 0 && followedIds.size === 0) {
    return json({ items: curated, reason: "curated" });
  }

  const signalTags = new Map<string, number>();
  for (const artwork of db.artworks) {
    if (!savedIds.has(artwork.id)) continue;
    for (const tag of [...artwork.style, ...artwork.dominantColors]) {
      signalTags.set(tag, (signalTags.get(tag) ?? 0) + 1);
    }
  }

  const scored = db.artworks
    .filter((a) => a.availability === "available" && !savedIds.has(a.id) && a.verificationStatus !== "rejected")
    .map((artwork) => {
      const tagScore = [...artwork.style, ...artwork.dominantColors].reduce(
        (sum, tag) => sum + (signalTags.get(tag) ?? 0),
        0,
      );
      const followBonus = followedIds.has(artwork.artistId) ? 2 : 0;
      return { artwork, score: tagScore + followBonus };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, LIMIT)
    .map((entry) => entry.artwork);

  if (scored.length === 0) return json({ items: curated, reason: "curated" });
  return json({ items: scored, reason: "personalized" });
}
