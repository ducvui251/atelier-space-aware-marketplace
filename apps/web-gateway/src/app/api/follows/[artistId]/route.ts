import type { NextRequest } from "next/server";
import { getServerDb, setServerDb } from "@/lib/gateway/runtime";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { toggleArtistFollow } from "@atelier/recommendation-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ artistId: string }> },
) {
  const user = getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const { artistId } = await params;
  const db = getServerDb();
  if (!db.artists.some((a) => a.id === artistId)) {
    return errorResponse("Artist not found", 404);
  }

  const result = toggleArtistFollow(db.follows, user.id, artistId);

  setServerDb({ ...db, follows: result.items });
  return json({ following: result.following });
}
