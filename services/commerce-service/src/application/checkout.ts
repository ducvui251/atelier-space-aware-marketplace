import type { Artwork, Order, Payment, PaymentMethod } from "@atelier/contracts";

export type CheckoutResult =
  | { ok: true; artworks: Artwork[]; orders: Order[]; payments: Payment[] }
  | { ok: false; reason: "empty" | "unavailable" | "payment-failed"; unavailableArtworkIds?: string[] };

interface CheckoutInput {
  buyerId: string;
  artworkIds: readonly string[];
  artworks: readonly Artwork[];
  shippingAddress: Order["shippingAddress"];
  method: PaymentMethod;
  simulateFailure?: boolean;
}

export function createCheckout(input: CheckoutInput): CheckoutResult {
  if (input.artworkIds.length === 0) return { ok: false, reason: "empty" };
  const unavailableArtworkIds = input.artworkIds.filter((id) => {
    const artwork = input.artworks.find((item) => item.id === id);
    return !artwork || artwork.availability !== "available";
  });
  if (unavailableArtworkIds.length > 0) return { ok: false, reason: "unavailable", unavailableArtworkIds };
  if (input.simulateFailure) return { ok: false, reason: "payment-failed" };

  let artworks = [...input.artworks];
  const orders: Order[] = [];
  const payments: Payment[] = [];
  for (const artworkId of input.artworkIds) {
    const artwork = artworks.find((item) => item.id === artworkId);
    if (!artwork) continue;
    const orderId = `order-${crypto.randomUUID()}`;
    orders.push({ id: orderId, buyerId: input.buyerId, artworkId, editionType: artwork.editionType, totalAmount: artwork.price, currency: artwork.currency, status: "paid", createdAt: new Date().toISOString(), shippingAddress: input.shippingAddress });
    payments.push({ id: `payment-${crypto.randomUUID()}`, orderId, amount: artwork.price, method: input.method, status: "success" });
    artworks = artworks.map((item) => item.id === artworkId ? { ...item, availability: "sold" } : item);
  }
  return { ok: true, artworks, orders, payments };
}
