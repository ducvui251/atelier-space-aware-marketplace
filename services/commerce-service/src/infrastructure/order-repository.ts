import type { Order } from "@atelier/contracts";
import { query } from "@atelier/persistence";

type OrderRow = { id: string; buyer_id: string; artwork_id: string; edition_type: Order["editionType"]; total_amount: string; currency: string; status: Order["status"]; created_at: string; shipping_address: Order["shippingAddress"] };

function mapOrder(row: OrderRow): Order {
  return { id: row.id, buyerId: row.buyer_id, artworkId: row.artwork_id, editionType: row.edition_type, totalAmount: Number(row.total_amount), currency: row.currency, status: row.status, createdAt: row.created_at, shippingAddress: row.shipping_address };
}

export async function listOrders(buyerId: string): Promise<Order[]> {
  const rows = await query<OrderRow>(
    `select id::text, buyer_id::text, artwork_id::text, edition_type,
            total_amount::text, currency, status, created_at::text, shipping_address
     from commerce.orders where buyer_id = $1::uuid order by created_at desc`, [buyerId],
  );
  return rows.map(mapOrder);
}

export async function listOrdersByIds(ids: string[]): Promise<Order[]> {
  if (ids.length === 0) return [];
  const rows = await query<OrderRow>(
    `select id::text, buyer_id::text, artwork_id::text, edition_type,
            total_amount::text, currency, status, created_at::text, shipping_address
     from commerce.orders where id = any($1::uuid[])`, [ids],
  );
  return rows.map(mapOrder);
}

/**
 * Aggregate figures for Admin's overview. Admin does not query
 * commerce.orders directly — it calls this instead.
 */
export async function getCommerceStats(): Promise<{ totalOrders: number; revenue: number }> {
  const rows = await query<{ total_orders: string; revenue: string | null }>(
    `select count(*)::text as total_orders,
            coalesce(sum(total_amount) filter (where status <> 'cancelled'), 0)::text as revenue
     from commerce.orders`,
  );
  return { totalOrders: Number(rows[0]?.total_orders ?? 0), revenue: Number(rows[0]?.revenue ?? 0) };
}
