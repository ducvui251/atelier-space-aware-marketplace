import type { NextRequest } from "next/server";
import { getServerDb, setServerDb, getCart } from "@/lib/gateway/runtime";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import { createCheckout } from "@atelier/commerce-service";
import { CheckoutRequestSchema } from "@atelier/contracts";

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = CheckoutRequestSchema.safeParse(body);
  if (!parsed.success) return errorResponse("shippingAddress.{fullName,address,city,phone} are required", 400);
  const { shippingAddress, method, simulateFailure } = parsed.data;

  const db = getServerDb();
  const cartArtworkIds = getCart(user.id);
  if (cartArtworkIds.length === 0) return errorResponse("Cart is empty", 400);

  const result = createCheckout({
    buyerId: user.id,
    artworkIds: cartArtworkIds,
    artworks: db.artworks,
    shippingAddress,
    method,
    simulateFailure,
  });
  if (!result.ok) {
    if (result.reason === "empty") return errorResponse("Cart is empty", 400);
    if (result.reason === "payment-failed") return errorResponse("Payment failed (simulated). Retry or change payment method.", 402);
    return errorResponse(`Artwork(s) no longer available: ${result.unavailableArtworkIds?.join(", ")}`, 409);
  }

  setServerDb({
    ...db,
    artworks: result.artworks,
    orders: [...db.orders, ...result.orders],
    payments: [...db.payments, ...result.payments],
    cartsByUser: { ...db.cartsByUser, [user.id]: [] },
  });

  return json({ orders: result.orders }, 201);
}
