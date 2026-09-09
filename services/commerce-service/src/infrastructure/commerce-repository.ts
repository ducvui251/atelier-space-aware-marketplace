import type { EditionType, Order, PaymentMethod } from "@atelier/contracts";
import { query, transaction } from "@atelier/persistence";
import { writeOutboxEvent } from "@atelier/events";

const SCHEMA = "commerce";

interface CheckoutItem { artworkId: string; editionType: EditionType; totalAmount: number; currency: string; title: string; }

export interface IdempotencyRecord { requestHash: string; orderIds: string[]; }

/**
 * Explicit idempotency-key persistence with request-body mismatch
 * detection (MICROSERVICE_100_PLAN.md section 9.3) — distinct from the
 * per-item ON CONFLICT below, which only guards against duplicate order
 * *rows*, not a key reused for a materially different request.
 */
export async function getIdempotencyRecord(buyerId: string, idempotencyKey: string): Promise<IdempotencyRecord | null> {
  const rows = await query<{ request_hash: string; order_ids: string[] }>(
    `select request_hash, order_ids from commerce.checkout_idempotency where buyer_id = $1::uuid and idempotency_key = $2`,
    [buyerId, idempotencyKey],
  );
  return rows[0] ? { requestHash: rows[0].request_hash, orderIds: rows[0].order_ids } : null;
}

export async function saveIdempotencyRecord(buyerId: string, idempotencyKey: string, requestHash: string, orderIds: string[]): Promise<void> {
  await query(
    `insert into commerce.checkout_idempotency (buyer_id, idempotency_key, request_hash, order_ids)
     values ($1::uuid, $2, $3, $4::jsonb)
     on conflict (buyer_id, idempotency_key) do nothing`,
    [buyerId, idempotencyKey, requestHash, JSON.stringify(orderIds)],
  );
}

/**
 * Creates orders + payments in `pending` state and clears the cart —
 * payment happens on Stripe's hosted Checkout page next, not here. See
 * `saveCheckoutSession` / `confirmCheckoutSession` for the rest of the flow.
 */
export async function persistPendingCheckout(input: {
  buyerId: string;
  items: CheckoutItem[];
  shippingAddress: Order["shippingAddress"];
  method: PaymentMethod;
  idempotencyKey: string;
}, correlationId: string): Promise<Order[]> {
  return transaction(async (client) => {
    const orders: Order[] = [];
    for (const item of input.items) {
      const order = await client.query<{ id: string; created_at: string }>(
        `insert into commerce.orders (buyer_id, artwork_id, edition_type, total_amount, currency, status, shipping_address, idempotency_key)
         values ($1::uuid, $2::uuid, $3, $4, $5, 'pending', $6::jsonb, $7)
         on conflict (buyer_id, idempotency_key) do nothing
         returning id::text, created_at::text`,
        [input.buyerId, item.artworkId, item.editionType, item.totalAmount, item.currency, JSON.stringify(input.shippingAddress), `${input.idempotencyKey}:${item.artworkId}`],
      );
      if (!order.rows[0]) continue;
      await client.query(
        `insert into commerce.payments (order_id, provider, amount, method, status)
         values ($1::uuid, 'stripe', $2, $3, 'pending')`, [order.rows[0].id, item.totalAmount, input.method],
      );
      await client.query(
        `delete from commerce.cart_items where buyer_id = $1::uuid and artwork_id = $2::uuid`, [input.buyerId, item.artworkId],
      );
      // Only reached when the order row was actually inserted (not an
      // idempotent no-op above), so a checkout retry never double-emits.
      await writeOutboxEvent(client, SCHEMA, {
        type: "OrderCreated",
        aggregateId: order.rows[0].id,
        correlationId,
        payload: { orderId: order.rows[0].id, buyerId: input.buyerId, artworkId: item.artworkId, amount: item.totalAmount, currency: item.currency },
      });
      orders.push({ id: order.rows[0].id, buyerId: input.buyerId, artworkId: item.artworkId, editionType: item.editionType, totalAmount: item.totalAmount, currency: item.currency, status: "pending", createdAt: order.rows[0].created_at, shippingAddress: input.shippingAddress });
    }
    return orders;
  });
}

export async function saveCheckoutSession(input: { stripeSessionId: string; buyerId: string; orderIds: string[]; reservationIds: string[] }): Promise<void> {
  await query(
    `insert into commerce.checkout_sessions (stripe_session_id, buyer_id, order_ids, reservation_ids)
     values ($1, $2::uuid, $3::jsonb, $4::jsonb)`,
    [input.stripeSessionId, input.buyerId, JSON.stringify(input.orderIds), JSON.stringify(input.reservationIds)],
  );
}

export interface CheckoutSessionRecord { orderIds: string[]; reservationIds: string[]; status: "open" | "completed" | "expired"; }

export async function getCheckoutSession(stripeSessionId: string): Promise<CheckoutSessionRecord | null> {
  const rows = await query<{ order_ids: string[]; reservation_ids: string[]; status: CheckoutSessionRecord["status"] }>(
    `select order_ids, reservation_ids, status from commerce.checkout_sessions where stripe_session_id = $1`,
    [stripeSessionId],
  );
  return rows[0] ? { orderIds: rows[0].order_ids, reservationIds: rows[0].reservation_ids, status: rows[0].status } : null;
}

/**
 * Marks every order/payment in the session paid, in one transaction, only
 * if the session isn't already completed — safe to call more than once
 * (e.g. the buyer reloading the success page) without double-applying.
 */
export async function confirmCheckoutSession(stripeSessionId: string, correlationId: string): Promise<{ orderIds: string[]; reservationIds: string[] } | null> {
  return transaction(async (client) => {
    const session = await client.query<{ order_ids: string[]; reservation_ids: string[] }>(
      `update commerce.checkout_sessions set status = 'completed'
       where stripe_session_id = $1 and status = 'open'
       returning order_ids, reservation_ids`,
      [stripeSessionId],
    );
    if (!session.rows[0]) return null;
    const { order_ids: orderIds, reservation_ids: reservationIds } = session.rows[0];
    await client.query(
      `update commerce.orders set status = 'paid', updated_at = now() where id = any($1::uuid[])`,
      [orderIds],
    );
    const paid = await client.query<{ payment_id: string; order_id: string; amount: string; currency: string; buyer_id: string; artwork_id: string }>(
      `update commerce.payments p set status = 'success', provider_payment_id = $2, updated_at = now()
       from commerce.orders o
       where p.order_id = any($1::uuid[]) and o.id = p.order_id
       returning p.id as payment_id, p.order_id, p.amount::text, o.currency, o.buyer_id::text, o.artwork_id::text`,
      [orderIds, stripeSessionId],
    );
    // Only reached once (this whole transaction is guarded by the `status
    // = 'open'` check above), so a buyer reloading the success page never
    // re-triggers this.
    for (const row of paid.rows) {
      await writeOutboxEvent(client, SCHEMA, {
        type: "PaymentSucceeded",
        aggregateId: row.order_id,
        correlationId,
        payload: { paymentId: row.payment_id, orderId: row.order_id, buyerId: row.buyer_id, artworkId: row.artwork_id, amount: Number(row.amount), currency: row.currency },
      });
    }
    return { orderIds, reservationIds };
  });
}
