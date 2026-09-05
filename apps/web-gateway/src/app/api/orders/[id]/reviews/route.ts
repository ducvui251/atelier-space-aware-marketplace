import type { NextRequest } from "next/server";
import { getServerDb, setServerDb } from "@/lib/gateway/runtime";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import type { Review } from "@/types";

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
  if (order.status !== "completed") {
    return errorResponse("Order must be 'completed' before reviewing", 409);
  }

  const body = await request.json().catch(() => null);
  const rating = Number(body?.rating);
  if (!(rating >= 1 && rating <= 5)) return errorResponse("rating must be 1-5", 400);

  const existing = db.reviews.find((r) => r.orderId === id);
  const review: Review = {
    id: existing?.id ?? `review-${crypto.randomUUID()}`,
    orderId: id,
    buyerId: user.id,
    rating,
    comment: typeof body?.comment === "string" ? body.comment : undefined,
  };

  setServerDb({
    ...db,
    reviews: existing ? db.reviews.map((r) => (r.id === review.id ? review : r)) : [...db.reviews, review],
  });
  return json(review, existing ? 200 : 201);
}
