import type { NextRequest } from "next/server";
import { getServerDb, setServerDb } from "@/lib/server/store";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

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

  const existing = db.follows.find((f) => f.buyerId === user.id && f.artistId === artistId);
  const follows = existing
    ? db.follows.filter((f) => f.id !== existing.id)
    : [...db.follows, { id: `follow-${crypto.randomUUID()}`, buyerId: user.id, artistId }];

  setServerDb({ ...db, follows });
  return json({ following: !existing });
}
