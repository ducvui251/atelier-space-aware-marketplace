import type { NextRequest } from "next/server";
import { getServerDb } from "@/lib/gateway/runtime";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  const roleError = requireRole(user, ["artist"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);

  const db = getServerDb();
  const myArtworkIds = new Set(db.artworks.filter((a) => a.artistId === user!.artistId).map((a) => a.id));
  const items = db.orders
    .filter((o) => myArtworkIds.has(o.artworkId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((order) => ({
      ...order,
      shipment: db.shipments.find((s) => s.orderId === order.id) ?? null,
    }));

  return json({ items, total: items.length });
}
