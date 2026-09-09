import type { CheckoutClientRequest, Order } from "@atelier/contracts";
import { requestService } from "../http-client";

export async function checkout(authUserId: string, input: CheckoutClientRequest, idempotencyKey: string) {
  return requestService<{ orders: Order[]; checkoutUrl?: string }>("commerce", "/v1/commerce/checkout", {
    method: "POST",
    body: { buyerId: authUserId, ...input },
    headers: { "idempotency-key": idempotencyKey },
    timeoutMs: 10_000,
  });
}

export async function confirmCheckoutSession(sessionId: string) {
  return requestService<{ orders: Order[] }>("commerce", "/v1/commerce/checkout/confirm", {
    method: "POST",
    body: { sessionId },
    timeoutMs: 10_000,
  });
}
