import type { NextRequest } from "next/server";
import { getServerDb, setServerDb } from "@/lib/server/store";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

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

  const existing = db.savedArtworks.find((s) => s.buyerId === user.id && s.artworkId === artworkId);
  const savedArtworks = existing
    ? db.savedArtworks.filter((s) => s.id !== existing.id)
    : [...db.savedArtworks, { id: `saved-${crypto.randomUUID()}`, buyerId: user.id, artworkId }];

  setServerDb({ ...db, savedArtworks });
  return json({ saved: !existing });
}
