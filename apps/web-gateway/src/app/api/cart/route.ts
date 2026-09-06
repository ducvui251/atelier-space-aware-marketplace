import type { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { addCartItem, getCart } from "@/lib/gateway/clients/commerce.client";
import { findArtwork } from "@/lib/gateway/clients/artwork.client";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const { artworkIds } = await getCart(user.id);
  const items = (await Promise.all(artworkIds.map((id) => findArtwork(id)))).filter((a): a is NonNullable<typeof a> => Boolean(a));
  return json({ items, total: items.reduce((sum, a) => sum + a.price, 0) });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const artworkId = typeof body?.artworkId === "string" ? body.artworkId : "";
  if (!artworkId) return errorResponse("artworkId is required", 400);

  try { return json(await addCartItem(user.id, artworkId), 201); }
  catch { return errorResponse("Artwork could not be added to cart", 409); }
}
