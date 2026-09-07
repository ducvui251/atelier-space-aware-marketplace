import type { Order } from "@atelier/contracts";
import { requestService } from "../http-client";

export async function listOrders(authUserId: string) {
  return requestService<{ items: Order[]; total: number }>("commerce", `/v1/commerce/orders?buyerId=${encodeURIComponent(authUserId)}`);
}
export async function listArtistOrders(artistId: string) { return requestService<{ items: unknown[]; total: number }>("commerce", `/v1/commerce/artist-orders?artistId=${encodeURIComponent(artistId)}`); }
export async function shipOrder(orderId: string, artistId: string, input: Record<string, unknown>) { return requestService<Record<string, unknown>>("commerce", `/v1/commerce/orders/${encodeURIComponent(orderId)}/ship`, { method: "POST", body: { ...input, artistId } }); }
export async function confirmReceived(orderId: string, buyerId: string) { return requestService<Record<string, unknown>>("commerce", `/v1/commerce/orders/${encodeURIComponent(orderId)}/confirm-received`, { method: "POST", body: { buyerId } }); }
export async function saveReview(orderId: string, buyerId: string, input: Record<string, unknown>) { return requestService<Record<string, unknown>>("commerce", `/v1/commerce/orders/${encodeURIComponent(orderId)}/reviews`, { method: "POST", body: { ...input, buyerId } }); }
