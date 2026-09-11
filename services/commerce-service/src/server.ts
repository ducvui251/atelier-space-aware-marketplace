import { createHash } from "node:crypto";
import { createServiceServer, getPort, readJson, writeServiceError, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { createLogger } from "@atelier/config/logger";
import { ArtistEarningsQuerySchema, CartAddRequestSchema, CheckoutConfirmRequestSchema, CheckoutRequestSchema, ConfirmReceivedRequestSchema, OrderReviewRequestSchema, ShipOrderRequestSchema, StripeWebhookRelaySchema, parseBody, type Artwork } from "@atelier/contracts";
import { runOutboxPublisher } from "@atelier/events";
import { ping } from "@atelier/persistence";
import { health } from "./health.ts";
import { addCartItem, listCart, removeCartItem } from "./infrastructure/cart-repository.ts";
import { confirmCheckoutSession, getCheckoutSession, getIdempotencyRecord, handleChargeRefunded, handlePaymentFailed, persistPendingCheckout, recordPaymentEvent, saveCheckoutSession, saveIdempotencyRecord } from "./infrastructure/commerce-repository.ts";
import { getArtistEarnings, getCommerceStats, listOrders, listOrdersByIds } from "./infrastructure/order-repository.ts";
import { confirmReceived, listArtistOrders, saveReview, shipOrder } from "./infrastructure/order-actions-repository.ts";
import { createCheckoutSession, retrieveCheckoutSession, retrievePaymentIntent } from "./infrastructure/stripe-client.ts";

function artistArtworkHeaders(): Record<string, string> {
  return process.env.ATELIER_INTERNAL_SERVICE_TOKEN ? { "x-service-token": process.env.ATELIER_INTERNAL_SERVICE_TOKEN } : {};
}

async function sourceArtworks(): Promise<Artwork[]> {
  const baseUrl = process.env.ARTIST_ARTWORK_SERVICE_URL ?? "http://localhost:4103";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/artist-artwork/artworks`, { headers: artistArtworkHeaders() });
  if (!response.ok) throw new Error(`Artist artwork service returned ${response.status}`);
  return ((await response.json()) as { items?: Artwork[] }).items ?? [];
}

/**
 * Atomic available -> reserved via the reservation contract
 * (MICROSERVICE_100_PLAN.md Phase 5), replacing the old
 * PATCH-availability-to-sold-with-manual-compensation step. Returns the
 * reservation id on success, null if the artwork was already taken by a
 * concurrent checkout.
 */
async function reserveArtworkRemote(artworkId: string, buyerId: string): Promise<string | null> {
  const baseUrl = process.env.ARTIST_ARTWORK_SERVICE_URL ?? "http://localhost:4103";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/artist-artwork/reservations`, {
    method: "POST", headers: { "content-type": "application/json", ...artistArtworkHeaders() }, body: JSON.stringify({ artworkId, buyerId }),
  });
  if (!response.ok) return null;
  return ((await response.json()) as { id: string }).id;
}

async function commitReservationRemote(reservationId: string): Promise<boolean> {
  const baseUrl = process.env.ARTIST_ARTWORK_SERVICE_URL ?? "http://localhost:4103";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/artist-artwork/reservations/${encodeURIComponent(reservationId)}/commit`, {
    method: "POST", headers: artistArtworkHeaders(),
  });
  return response.ok;
}

async function releaseReservationRemote(reservationId: string): Promise<void> {
  const baseUrl = process.env.ARTIST_ARTWORK_SERVICE_URL ?? "http://localhost:4103";
  await fetch(`${baseUrl.replace(/\/$/, "")}/v1/artist-artwork/reservations/${encodeURIComponent(reservationId)}/release`, {
    method: "POST", headers: artistArtworkHeaders(),
  });
}

function hashCheckoutRequest(buyerId: string, shippingAddress: unknown, method: string): string {
  return createHash("sha256").update(JSON.stringify({ buyerId, shippingAddress, method })).digest("hex");
}

const logger = createLogger("commerce");

const routes: Record<string, ServiceRouteHandler> = {
  "GET /v1/commerce/cart": async ({ url, response, correlationId }) => {
    const buyerId = url.searchParams.get("buyerId");
    if (!buyerId) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "buyerId is required", correlationId, field: "buyerId", retryable: false });
    const artworkIds = await listCart(buyerId);
    return writeServiceJson(response, 200, { artworkIds }, correlationId);
  },
  "POST /v1/commerce/cart": async ({ request, response, correlationId }) => {
    const parsed = parseBody(CartAddRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    return writeServiceJson(response, 201, { artworkIds: await addCartItem(parsed.data.buyerId, parsed.data.artworkId) }, correlationId);
  },
  "DELETE /v1/commerce/cart/:artworkId": async ({ request, url, response, correlationId }) => {
    const buyerId = url.searchParams.get("buyerId");
    const artworkId = url.pathname.split("/").pop();
    if (!buyerId || !artworkId) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "buyerId and artworkId are required", correlationId, retryable: false });
    return writeServiceJson(response, 200, { artworkIds: await removeCartItem(buyerId, artworkId) }, correlationId);
  },
  "POST /v1/commerce/checkout": async ({ request, response, correlationId }) => {
    const parsed = parseBody(CheckoutRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const { buyerId } = parsed.data;

    const idempotencyKey = request.headers["idempotency-key"]?.toString() ?? correlationId;
    const requestHash = hashCheckoutRequest(buyerId, parsed.data.shippingAddress, parsed.data.method);
    const existing = await getIdempotencyRecord(buyerId, idempotencyKey);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        return writeServiceError(response, 409, { code: "IDEMPOTENCY_KEY_REUSED", message: "This idempotency key was already used for a different request", correlationId, retryable: false });
      }
      // Same key, same request: return the original result instead of re-running checkout.
      return writeServiceJson(response, 200, { orders: await listOrdersByIds(existing.orderIds) }, correlationId);
    }

    const artworkIds = await listCart(buyerId);
    const source = await sourceArtworks();
    const items = artworkIds.map((id) => source.find((artwork) => artwork.id === id)).filter((item): item is Artwork => Boolean(item));
    if (items.length !== artworkIds.length) return writeServiceError(response, 409, { code: "CONFLICT", message: "Artwork is no longer available", correlationId, retryable: false });
    if (items.some((item) => item.availability !== "available")) return writeServiceError(response, 409, { code: "CONFLICT", message: "Artwork is no longer available", correlationId, retryable: false });

    const reservations: { artworkId: string; reservationId: string }[] = [];
    for (const item of items) {
      const reservationId = await reserveArtworkRemote(item.id, buyerId);
      if (!reservationId) {
        await Promise.all(reservations.map((r) => releaseReservationRemote(r.reservationId)));
        return writeServiceError(response, 409, { code: "CONFLICT", message: "Artwork is no longer available", correlationId, retryable: false });
      }
      reservations.push({ artworkId: item.id, reservationId });
    }

    try {
      const orders = await persistPendingCheckout({ buyerId, items: items.map((item) => ({ artworkId: item.id, editionType: item.editionType, totalAmount: item.price, currency: item.currency, title: item.title })), shippingAddress: parsed.data.shippingAddress, method: parsed.data.method, idempotencyKey }, correlationId);
      const gatewayUrl = (process.env.WEB_GATEWAY_URL ?? "http://localhost:3000").replace(/\/$/, "");
      const session = await createCheckoutSession({
        buyerId,
        orderIds: orders.map((order) => order.id),
        items: items.map((item) => ({ artworkId: item.id, title: item.title, amount: item.price, currency: item.currency })),
        successUrl: `${gatewayUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${gatewayUrl}/checkout?cancelled=1`,
      });
      await saveCheckoutSession({ stripeSessionId: session.id, buyerId, orderIds: orders.map((order) => order.id), reservationIds: reservations.map((r) => r.reservationId) });
      await saveIdempotencyRecord(buyerId, idempotencyKey, requestHash, orders.map((order) => order.id));
      return writeServiceJson(response, 201, { orders, checkoutUrl: session.url }, correlationId);
    } catch (error) {
      await Promise.all(reservations.map((r) => releaseReservationRemote(r.reservationId)));
      throw error;
    }
  },
  "POST /v1/commerce/checkout/confirm": async ({ request, response, correlationId }) => {
    const parsed = parseBody(CheckoutConfirmRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const { sessionId } = parsed.data;

    const session = await getCheckoutSession(sessionId);
    if (!session) return writeServiceError(response, 404, { code: "NOT_FOUND", message: "Unknown checkout session", correlationId, retryable: false });
    if (session.status === "completed") return writeServiceJson(response, 200, { orders: await listOrdersByIds(session.orderIds) }, correlationId);

    const stripeSession = await retrieveCheckoutSession(sessionId);
    if (stripeSession.payment_status !== "paid") {
      return writeServiceError(response, 409, { code: "PAYMENT_NOT_COMPLETE", message: "Stripe has not confirmed payment for this session yet", correlationId, retryable: true });
    }

    const confirmed = await confirmCheckoutSession(sessionId, correlationId);
    if (!confirmed) return writeServiceJson(response, 200, { orders: await listOrdersByIds(session.orderIds) }, correlationId);

    const commits = await Promise.all(confirmed.reservationIds.map((id) => commitReservationRemote(id)));
    if (commits.some((ok) => !ok)) {
      // Mirrors the same operational-alert case the old synchronous flow
      // logged: a reservation lease expired between reserving and Stripe
      // confirming payment. The order is already paid, so this is now a
      // mismatched-inventory alert, not something to roll back from.
      logger.error("one or more reservation commits failed after payment", { correlationId, sessionId, orderIds: confirmed.orderIds });
    }
    return writeServiceJson(response, 200, { orders: await listOrdersByIds(confirmed.orderIds) }, correlationId);
  },
  /**
   * Phase 6, G-04. The Gateway has already verified the Stripe signature
   * against the raw request body before relaying here — this route trusts
   * the internal token, not a second signature check. `recordPaymentEvent`
   * is the idempotency gate: a duplicate delivery (Stripe retries on any
   * non-2xx, and can also just double-send) returns 200 immediately without
   * re-running any side effect. Converges with the poll-confirm path
   * (`checkout/confirm` above) through the same `confirmCheckoutSession`
   * function and the same `status = 'open'` guard, so whichever path wins
   * the race, the other is a safe no-op.
   */
  "POST /v1/commerce/payments/webhook": async ({ request, response, correlationId }) => {
    const parsed = parseBody(StripeWebhookRelaySchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const { id: eventId, type: eventType, data } = parsed.data;

    const isNew = await recordPaymentEvent(eventId, eventType, parsed.data);
    if (!isNew) return writeServiceJson(response, 200, { received: true, duplicate: true }, correlationId);

    switch (eventType) {
      case "checkout.session.completed": {
        const sessionId = typeof data.object.id === "string" ? data.object.id : "";
        if (sessionId) {
          const confirmed = await confirmCheckoutSession(sessionId, correlationId);
          if (confirmed) {
            const commits = await Promise.all(confirmed.reservationIds.map((id) => commitReservationRemote(id)));
            if (commits.some((ok) => !ok)) logger.error("one or more reservation commits failed after webhook payment", { correlationId, sessionId });
          }
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const metadata = data.object.metadata as { orderIds?: string } | undefined;
        const orderIds: string[] = metadata?.orderIds ? JSON.parse(metadata.orderIds) : [];
        const result = await handlePaymentFailed(orderIds, correlationId);
        if (result) await Promise.all(result.reservationIds.map((id) => releaseReservationRemote(id)));
        break;
      }
      case "charge.refunded": {
        const paymentIntentId = typeof data.object.payment_intent === "string" ? data.object.payment_intent : "";
        if (paymentIntentId) {
          const paymentIntent = await retrievePaymentIntent(paymentIntentId).catch(() => null);
          const orderIds: string[] = paymentIntent?.metadata?.orderIds ? JSON.parse(paymentIntent.metadata.orderIds) : [];
          await handleChargeRefunded(orderIds);
        }
        break;
      }
      default:
        // Recorded in payment_events above; no state transition defined for this type.
        break;
    }
    return writeServiceJson(response, 200, { received: true }, correlationId);
  },
  "GET /v1/commerce/stats": async ({ response, correlationId }) => writeServiceJson(response, 200, await getCommerceStats(), correlationId),
  "GET /v1/commerce/orders": async ({ url, response, correlationId }) => {
    const buyerId = url.searchParams.get("buyerId");
    if (!buyerId) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "buyerId is required", correlationId, field: "buyerId", retryable: false });
    const items = await listOrders(buyerId);
    return writeServiceJson(response, 200, { items, total: items.length }, correlationId);
  },
  "GET /v1/commerce/artist-orders": async ({ url, response, correlationId }) => {
    const artistId = url.searchParams.get("artistId");
    if (!artistId) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "artistId is required", correlationId, field: "artistId", retryable: false });
    const items = await listArtistOrders(artistId);
    return writeServiceJson(response, 200, { items, total: items.length }, correlationId);
  },
  "GET /v1/commerce/artist-earnings": async ({ url, response, correlationId }) => {
    const artistId = url.searchParams.get("artistId");
    if (!artistId) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "artistId is required", correlationId, field: "artistId", retryable: false });
    const parsed = parseBody(ArtistEarningsQuerySchema, Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const to = parsed.data.to ? new Date(`${parsed.data.to}T00:00:00.000Z`) : new Date();
    // Trailing 90-day default window when the caller doesn't specify one.
    const from = parsed.data.from
      ? new Date(`${parsed.data.from}T00:00:00.000Z`)
      : new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
    const earnings = await getArtistEarnings(artistId, { period: parsed.data.period, from: from.toISOString(), to: to.toISOString() });
    return writeServiceJson(response, 200, earnings, correlationId);
  },
  "POST /v1/commerce/orders/:id/ship": async ({ request, url, response, correlationId }) => {
    const parsed = parseBody(ShipOrderRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const shipment = await shipOrder(url.pathname.split("/")[4] ?? "", parsed.data.artistId, { carrier: parsed.data.carrier, trackingNumber: parsed.data.trackingNumber }, correlationId);
    return shipment ? writeServiceJson(response, 200, shipment, correlationId) : writeServiceError(response, 403, { code: "FORBIDDEN", message: "This order does not belong to the artist", correlationId, retryable: false });
  },
  "POST /v1/commerce/orders/:id/confirm-received": async ({ request, url, response, correlationId }) => {
    const parsed = parseBody(ConfirmReceivedRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const order = await confirmReceived(url.pathname.split("/")[4] ?? "", parsed.data.buyerId);
    return order ? writeServiceJson(response, 200, order, correlationId) : writeServiceError(response, 409, { code: "CONFLICT", message: "Order must be shipped and belong to the buyer", correlationId, retryable: false });
  },
  "POST /v1/commerce/orders/:id/reviews": async ({ request, url, response, correlationId }) => {
    const parsed = parseBody(OrderReviewRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const review = await saveReview({ orderId: url.pathname.split("/")[4] ?? "", buyerId: parsed.data.buyerId, rating: parsed.data.rating, comment: parsed.data.comment });
    return review ? writeServiceJson(response, 200, review, correlationId) : writeServiceError(response, 409, { code: "CONFLICT", message: "Order cannot be reviewed", correlationId, retryable: false });
  },
};

async function ready() {
  const database = (await ping()) ? ("ok" as const) : ("unavailable" as const);
  return { status: database, dependencies: { database } };
}

createServiceServer({ name: "commerce", version: "v1", port: getPort("COMMERCE_PORT", 4104), health, ready, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("COMMERCE_PORT", 4104));

if (process.env.EVENT_BROKER_URL) {
  runOutboxPublisher({
    schema: "commerce",
    brokerUrl: process.env.EVENT_BROKER_URL,
    exchange: process.env.EVENT_EXCHANGE ?? "atelier.events.v1",
    producer: "commerce",
  });
}
