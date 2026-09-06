import type { EditionType, Order, PaymentMethod } from "@atelier/contracts";
import { transaction } from "@atelier/persistence";

interface CheckoutItem { artworkId: string; editionType: EditionType; totalAmount: number; currency: string; }

export async function persistCheckout(input: {
  authUserId: string;
  items: CheckoutItem[];
  shippingAddress: Order["shippingAddress"];
  method: PaymentMethod;
  idempotencyKey: string;
}): Promise<Order[]> {
  return transaction(async (client) => {
    const buyer = await client.query<{ id: string }>(`select id::text from account.users where auth_user_id = $1::uuid`, [input.authUserId]);
    if (!buyer.rows[0]) throw new Error("Account profile not found");
    const orders: Order[] = [];
    for (const item of input.items) {
      const order = await client.query<{ id: string; created_at: string }>(
        `insert into commerce.orders (buyer_id, artwork_id, edition_type, total_amount, currency, status, shipping_address, idempotency_key)
         values ($1::uuid, $2::uuid, $3, $4, $5, 'paid', $6::jsonb, $7)
         on conflict (buyer_id, idempotency_key) do nothing
         returning id::text, created_at::text`,
        [buyer.rows[0].id, item.artworkId, item.editionType, item.totalAmount, item.currency, JSON.stringify(input.shippingAddress), `${input.idempotencyKey}:${item.artworkId}`],
      );
      if (!order.rows[0]) continue;
      await client.query(
        `insert into commerce.payments (order_id, provider, amount, method, status)
         values ($1::uuid, 'atelier-mvp', $2, $3, 'success')`, [order.rows[0].id, item.totalAmount, input.method],
      );
      await client.query(
        `delete from commerce.cart_items where buyer_id = $1::uuid and artwork_id = $2::uuid`, [buyer.rows[0].id, item.artworkId],
      );
      orders.push({ id: order.rows[0].id, buyerId: input.authUserId, artworkId: item.artworkId, editionType: item.editionType, totalAmount: item.totalAmount, currency: item.currency, status: "paid", createdAt: order.rows[0].created_at, shippingAddress: input.shippingAddress });
    }
    return orders;
  });
}
