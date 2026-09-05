import type { NextRequest } from "next/server";
import { getServerDb, setServerDb } from "@/lib/gateway/runtime";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { toggleSavedArtwork } from "@atelier/recommendation-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ artworkId: string }> },
) {
  const user = getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const { artworkId } = await params;
  const db = getServerDb();
  if (!db.artworks.some((a) => a.id === artworkId)) {
    return errorResponse("Artwork not found", 404);
  }

  const result = toggleSavedArtwork(db.savedArtworks, user.id, artworkId);

  setServerDb({ ...db, savedArtworks: result.items });
  return json({ saved: result.saved });
}
