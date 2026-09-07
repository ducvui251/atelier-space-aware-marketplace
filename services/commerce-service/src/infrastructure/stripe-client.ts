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
 * Creates a Stripe-hosted Checkout Session for one order batch. No webhook
 * is configured for local dev — the buyer's browser returns to
 * `successUrl` carrying `{CHECKOUT_SESSION_ID}`, and that page asks Stripe
 * (via `retrieveCheckoutSession`) whether it actually paid before anything
 * server-side is finalized. See runbooks/stripe-integration.md.
 */
export async function createCheckoutSession(input: {
  buyerId: string;
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
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });
}

export async function retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return getClient().checkout.sessions.retrieve(sessionId);
}
