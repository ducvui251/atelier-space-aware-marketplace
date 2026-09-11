import Stripe from "stripe";
import type { NextRequest } from "next/server";
import { StripeWebhookRelaySchema } from "@atelier/contracts";
import { relayStripeWebhook } from "@/lib/gateway/clients/commerce-checkout.client";

/**
 * Phase 6, G-04. Stripe requires the exact raw request bytes to verify the
 * `stripe-signature` header (any re-serialization breaks the HMAC), so this
 * reads `request.text()` — never `.json()` — before doing anything else.
 * Unauthenticated by design: Stripe is not a logged-in user; the signature
 * check below is the only authentication this route has, which is why it
 * fails closed (500) if the webhook secret isn't configured, rather than
 * silently accepting unverified events.
 *
 * Only verifies + relays here — parsing/interpreting the event happens in
 * Commerce (`POST /v1/commerce/payments/webhook`), matching the plan's
 * explicit instruction that "the Gateway must not parse or reinterpret the
 * event" (§10.2).
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!webhookSecret || !apiKey) {
    return new Response("Stripe webhook is not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature header", { status: 400 });

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = new Stripe(apiKey).webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const relay = StripeWebhookRelaySchema.safeParse({ id: event.id, type: event.type, data: event.data });
  if (!relay.success) return new Response("Malformed event", { status: 400 });

  try {
    await relayStripeWebhook(relay.data);
  } catch {
    // Non-2xx tells Stripe to retry — Commerce's payment_events table
    // dedupes by provider event id, so a retry is always safe.
    return new Response("Failed to relay webhook", { status: 502 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "content-type": "application/json" } });
}
