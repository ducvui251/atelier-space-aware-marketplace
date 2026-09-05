import type { NextRequest } from "next/server";
import { getServerDb, setServerDb, getCart } from "@/lib/server/store";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";
import type { Order, Payment } from "@/types";

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const { fullName, address, city, phone } = body?.shippingAddress ?? {};
  if (![fullName, address, city, phone].every((v) => typeof v === "string" && v.trim())) {
    return errorResponse("shippingAddress.{fullName,address,city,phone} are required", 400);
  }
  const method = body?.method === "wallet" ? "wallet" : "card";

  const db = getServerDb();
  const cartArtworkIds = getCart(user.id);
  if (cartArtworkIds.length === 0) return errorResponse("Cart is empty", 400);

  const unavailable = cartArtworkIds.filter((id) => {
    const artwork = db.artworks.find((a) => a.id === id);
    return !artwork || artwork.availability !== "available";
  });
  if (unavailable.length > 0) {
    return errorResponse(
      `Artwork(s) no longer available: ${unavailable.join(", ")}`,
      409,
    );
  }
  if (body?.simulateFailure) {
    return errorResponse("Payment failed (simulated). Retry or change payment method.", 402);
  }

  let artworks = db.artworks;
  const newOrders: Order[] = [];
  const newPayments: Payment[] = [];
  for (const artworkId of cartArtworkIds) {
    const artwork = artworks.find((a) => a.id === artworkId)!;
    const orderId = `order-${crypto.randomUUID()}`;
    newOrders.push({
      id: orderId,
      buyerId: user.id,
      artworkId,
      editionType: artwork.editionType,
      totalAmount: artwork.price,
      currency: artwork.currency,
      status: "paid",
      createdAt: new Date().toISOString(),
      shippingAddress: { fullName, address, city, phone },
    });
    newPayments.push({
      id: `payment-${crypto.randomUUID()}`,
      orderId,
      amount: artwork.price,
      method,
      status: "success",
    });
    artworks = artworks.map((a) => (a.id === artworkId ? { ...a, availability: "sold" } : a));
  }

  setServerDb({
    ...db,
    artworks,
    orders: [...db.orders, ...newOrders],
    payments: [...db.payments, ...newPayments],
    cartsByUser: { ...db.cartsByUser, [user.id]: [] },
  });

  return json({ orders: newOrders }, 201);
}
