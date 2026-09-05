import type { NextRequest } from "next/server";
import { getServerDb } from "@/lib/server/store";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const db = getServerDb();
  const items = db.orders
    .filter((o) => o.buyerId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((order) => ({
      ...order,
      shipment: db.shipments.find((s) => s.orderId === order.id) ?? null,
      review: db.reviews.find((r) => r.orderId === order.id) ?? null,
      complaint: db.complaints.find((c) => c.orderId === order.id) ?? null,
    }));

  return json({ items, total: items.length });
}
