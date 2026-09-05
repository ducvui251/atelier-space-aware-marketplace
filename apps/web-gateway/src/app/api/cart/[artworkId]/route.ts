import type { NextRequest } from "next/server";
import { getServerDb, setServerDb } from "@/lib/gateway/runtime";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { removeFromCart } from "@atelier/commerce-service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ artworkId: string }> },
) {
  const user = getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const { artworkId } = await params;
  const db = getServerDb();
  const next = removeFromCart(db.cartsByUser, user.id, artworkId);
  setServerDb({ ...db, cartsByUser: { ...db.cartsByUser, [user.id]: next } });
  return json({ artworkIds: next });
}
