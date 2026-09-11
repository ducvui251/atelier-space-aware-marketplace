import type { CheckoutClientRequest, Order, StripeWebhookRelay } from "@atelier/contracts";
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

/** Phase 6, G-04 — relays an already signature-verified Stripe event. */
export async function relayStripeWebhook(event: StripeWebhookRelay) {
  return requestService<{ received: true; duplicate?: boolean }>("commerce", "/v1/commerce/payments/webhook", {
    method: "POST",
    body: event,
    timeoutMs: 10_000,
  });
}
