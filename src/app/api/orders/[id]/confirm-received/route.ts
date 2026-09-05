import type { NextRequest } from "next/server";
import { getServerDb, setServerDb } from "@/lib/server/store";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const db = getServerDb();
  const order = db.orders.find((o) => o.id === id && o.buyerId === user.id);
  if (!order) return errorResponse("Order not found", 404);
  if (order.status !== "shipped") {
    return errorResponse(`Order must be 'shipped' to confirm receipt (current: ${order.status})`, 409);
  }

  const updated = { ...order, status: "completed" as const };
  setServerDb({ ...db, orders: db.orders.map((o) => (o.id === id ? updated : o)) });
  return json(updated);
}
