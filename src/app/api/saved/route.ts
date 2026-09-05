import type { NextRequest } from "next/server";
import { getServerDb } from "@/lib/server/store";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const db = getServerDb();
  const artworkIds = db.savedArtworks.filter((s) => s.buyerId === user.id).map((s) => s.artworkId);
  const items = artworkIds
    .map((id) => db.artworks.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  return json({ items, total: items.length });
}
