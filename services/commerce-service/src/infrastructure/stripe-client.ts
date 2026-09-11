import Stripe from "stripe";

let client: Stripe | undefined;

function getClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is required to create a checkout session");
  client ??= new Stripe(secretKey);
  return client;
}

export interface CheckoutLineItem {
  artworkId: string;
  title: string;
  amount: number;
  currency: string;
}

/**
 * Creates a Stripe-hosted Checkout Session for one order batch. The buyer's
 * browser returns to `successUrl` carrying `{CHECKOUT_SESSION_ID}`, and that
 * page asks Stripe (via `retrieveCheckoutSession`) whether it actually paid
 * — a degraded fallback for when the webhook (Phase 6, G-04) hasn't arrived
 * yet, e.g. the buyer closed the tab right after paying. Both paths
 * converge on the same idempotent state machine (`confirmCheckoutSession`'s
 * `status = 'open'` guard). See runbooks/stripe-integration.md.
 *
 * `orderIds` is stored on the PaymentIntent's own metadata (not just the
 * Session's) because `payment_intent.payment_failed` and `charge.refunded`
 * webhook events carry a PaymentIntent/Charge object, not the Checkout
 * Session — Stripe's Session-level `metadata` does not otherwise appear
 * anywhere in those events, and `session.payment_intent` is confirmed `null`
 * immediately after creation (a real API call, not assumed), so there's no
 * way to look this up later purely from data written at session-creation
 * time. Setting it on `payment_intent_data.metadata` up front means it's
 * simply *there* in the failure/refund webhook payload once the PaymentIntent
 * exists — no separate lookup table needed.
 */
export async function createCheckoutSession(input: {
  buyerId: string;
  orderIds: string[];
  items: CheckoutLineItem[];
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  return getClient().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: input.items.map((item) => ({
      quantity: 1,
      price_data: {
        currency: item.currency.toLowerCase(),
        unit_amount: Math.round(item.amount * 100),
        product_data: { name: item.title },
      },
    })),
    metadata: { buyerId: input.buyerId },
    payment_intent_data: { metadata: { orderIds: JSON.stringify(input.orderIds) } },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });
}

export async function retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return getClient().checkout.sessions.retrieve(sessionId);
}

/**
 * Used by the webhook handler for `payment_intent.payment_failed` and
 * `charge.refunded` to recover the `orderIds` set at checkout time (see
 * `createCheckoutSession`'s doc comment) — `charge.refunded`'s payload only
 * has the Charge object, which references its PaymentIntent by id but not
 * by metadata, so this is one extra round trip rather than an assumption
 * about metadata propagating from PaymentIntent to Charge.
 */
export async function retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  return getClient().paymentIntents.retrieve(paymentIntentId);
}
