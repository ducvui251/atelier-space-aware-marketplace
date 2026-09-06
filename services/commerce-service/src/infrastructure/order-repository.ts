import type { Order } from "@atelier/contracts";
import { query } from "@atelier/persistence";

type OrderRow = { id: string; buyer_id: string; artwork_id: string; edition_type: Order["editionType"]; total_amount: string; currency: string; status: Order["status"]; created_at: string; shipping_address: Order["shippingAddress"] };

function mapOrder(row: OrderRow): Order {
  return { id: row.id, buyerId: row.buyer_id, artworkId: row.artwork_id, editionType: row.edition_type, totalAmount: Number(row.total_amount), currency: row.currency, status: row.status, createdAt: row.created_at, shippingAddress: row.shipping_address };
}

export async function listOrders(authUserId: string): Promise<Order[]> {
  const rows = await query<OrderRow>(
    `select o.id::text, u.auth_user_id::text as buyer_id, o.artwork_id::text, o.edition_type,
            o.total_amount::text, o.currency, o.status, o.created_at::text, o.shipping_address
     from commerce.orders o join account.users u on u.id = o.buyer_id
     where u.auth_user_id = $1::uuid order by o.created_at desc`, [authUserId],
  );
  return rows.map(mapOrder);
}
