import type { Order, Review, Shipment } from "@atelier/contracts";
import { query } from "@atelier/persistence";

export async function listArtistOrders(artistId: string) {
  const rows = await query<Order & { shipment_id: string | null; carrier: string | null; tracking_number: string | null; shipment_status: Shipment["status"] | null }>(
    `select o.id::text as id, u.auth_user_id::text as "buyerId", o.artwork_id::text as "artworkId", o.edition_type as "editionType", o.total_amount::numeric as "totalAmount", o.currency, o.status, o.created_at::text as "createdAt", o.shipping_address as "shippingAddress", s.id::text as shipment_id, s.carrier, s.tracking_number, s.status as shipment_status
     from commerce.orders o join account.users u on u.id = o.buyer_id join artist_artwork.artworks a on a.id = o.artwork_id
     left join commerce.shipments s on s.order_id = o.id where a.artist_id::text = $1 order by o.created_at desc`, [artistId],
  );
  return rows.map((row) => ({ id: row.id, buyerId: row.buyerId, artworkId: row.artworkId, editionType: row.editionType, totalAmount: Number(row.totalAmount), currency: row.currency, status: row.status, createdAt: row.createdAt, shippingAddress: row.shippingAddress, shipment: row.shipment_id ? { id: row.shipment_id, orderId: row.id, carrier: row.carrier ?? undefined, trackingNumber: row.tracking_number ?? undefined, status: row.shipment_status! } : null }));
}

export async function shipOrder(orderId: string, artistId: string, input: { carrier: string; trackingNumber: string }): Promise<Shipment | null> {
  const rows = await query<{ id: string }>(`select o.id::text from commerce.orders o join artist_artwork.artworks a on a.id = o.artwork_id where o.id::text = $1 and a.artist_id::text = $2`, [orderId, artistId]);
  if (!rows[0]) return null;
  const shipment = await query<{ id: string }>(
    `insert into commerce.shipments (order_id, carrier, tracking_number, status) values ($1::uuid, $2, $3, 'in_transit')
     on conflict (order_id) do update set carrier = excluded.carrier, tracking_number = excluded.tracking_number, status = 'in_transit', updated_at = now() returning id::text`, [orderId, input.carrier, input.trackingNumber],
  );
  await query(`update commerce.orders set status = 'shipped', updated_at = now() where id::text = $1`, [orderId]);
  return shipment[0] ? { id: shipment[0].id, orderId, carrier: input.carrier, trackingNumber: input.trackingNumber, status: "in_transit" } : null;
}

export async function confirmReceived(orderId: string, authUserId: string): Promise<Order | null> {
  const rows = await query<Order & { buyer_id: string; artwork_id: string; total_amount: string; edition_type: Order["editionType"]; created_at: string; shipping_address: Order["shippingAddress"] }>(
    `update commerce.orders o set status = 'completed', updated_at = now() from account.users u where o.id::text = $1 and o.buyer_id = u.id and u.auth_user_id = $2::uuid and o.status = 'shipped' returning o.id::text, u.auth_user_id::text as buyer_id, o.artwork_id::text, o.edition_type, o.total_amount::text, o.currency, o.status, o.created_at::text, o.shipping_address`, [orderId, authUserId],
  );
  const row = rows[0];
  return row ? { id: row.id, buyerId: row.buyer_id, artworkId: row.artwork_id, editionType: row.edition_type, totalAmount: Number(row.total_amount), currency: row.currency, status: row.status, createdAt: row.created_at, shippingAddress: row.shipping_address } : null;
}

export async function saveReview(input: { orderId: string; authUserId: string; rating: number; comment?: string }): Promise<Review | null> {
  const rows = await query<{ id: string; buyer_id: string }>(`select o.id::text, o.buyer_id::text from commerce.orders o join account.users u on u.id = o.buyer_id where o.id::text = $1 and u.auth_user_id = $2::uuid and o.status = 'completed'`, [input.orderId, input.authUserId]);
  if (!rows[0]) return null;
  const review = await query<{ id: string }>(`insert into commerce.reviews (order_id, buyer_id, rating, comment) values ($1::uuid, $2::uuid, $3, $4) on conflict (order_id) do update set rating = excluded.rating, comment = excluded.comment, updated_at = now() returning id::text`, [input.orderId, rows[0].buyer_id, input.rating, input.comment ?? null]);
  return review[0] ? { id: review[0].id, orderId: input.orderId, buyerId: input.authUserId, rating: input.rating, ...(input.comment ? { comment: input.comment } : {}) } : null;
}
