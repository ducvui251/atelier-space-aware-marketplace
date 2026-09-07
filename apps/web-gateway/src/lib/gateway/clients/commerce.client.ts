import { requestService } from "../http-client";

export async function getCart(authUserId: string) {
  return requestService<{ artworkIds: string[] }>("commerce", `/v1/commerce/cart?buyerId=${encodeURIComponent(authUserId)}`);
}

export async function addCartItem(authUserId: string, artworkId: string) {
  return requestService<{ artworkIds: string[] }>("commerce", "/v1/commerce/cart", { method: "POST", body: { buyerId: authUserId, artworkId } });
}

export async function removeCartItem(authUserId: string, artworkId: string) {
  return requestService<{ artworkIds: string[] }>("commerce", `/v1/commerce/cart/${encodeURIComponent(artworkId)}?buyerId=${encodeURIComponent(authUserId)}`, { method: "DELETE" });
}
