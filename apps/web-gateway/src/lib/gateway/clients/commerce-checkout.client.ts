import type { CheckoutRequest, Order } from "@atelier/contracts";
import { requestService } from "../http-client";

export async function checkout(authUserId: string, input: CheckoutRequest, idempotencyKey: string) {
  return requestService<{ orders: Order[] }>("commerce", "/v1/commerce/checkout", {
    method: "POST",
    body: { buyerId: authUserId, ...input },
    headers: { "idempotency-key": idempotencyKey },
    timeoutMs: 10_000,
  });
}
