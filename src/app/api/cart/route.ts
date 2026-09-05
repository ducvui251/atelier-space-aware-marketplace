import type { NextRequest } from "next/server";
import { getServerDb, setServerDb, getCart } from "@/lib/server/store";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const db = getServerDb();
  const artworkIds = getCart(user.id);
  const items = artworkIds
    .map((id) => db.artworks.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  return json({ items, total: items.reduce((sum, a) => sum + a.price, 0) });
}

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const artworkId = typeof body?.artworkId === "string" ? body.artworkId : "";
  if (!artworkId) return errorResponse("artworkId is required", 400);

  const db = getServerDb();
  if (!db.artworks.some((a) => a.id === artworkId)) {
    return errorResponse("Artwork not found", 404);
  }

  const current = getCart(user.id);
  const next = current.includes(artworkId) ? current : [...current, artworkId];
  setServerDb({ ...db, cartsByUser: { ...db.cartsByUser, [user.id]: next } });
  return json({ artworkIds: next }, 201);
}
