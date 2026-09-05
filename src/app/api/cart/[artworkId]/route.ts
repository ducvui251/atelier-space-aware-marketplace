import type { NextRequest } from "next/server";
import { getServerDb, setServerDb, getCart } from "@/lib/server/store";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ artworkId: string }> },
) {
  const user = getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const { artworkId } = await params;
  const db = getServerDb();
  const next = getCart(user.id).filter((id) => id !== artworkId);
  setServerDb({ ...db, cartsByUser: { ...db.cartsByUser, [user.id]: next } });
  return json({ artworkIds: next });
}
