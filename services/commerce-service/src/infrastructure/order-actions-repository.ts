import type { Order, Review, Shipment } from "@atelier/contracts";
import { query } from "@atelier/persistence";
import { requestInternalService } from "@atelier/config/service-client";

type OrderRow = { id: string; buyer_id: string; artwork_id: string; edition_type: Order["editionType"]; total_amount: string; currency: string; status: Order["status"]; created_at: string; shipping_address: Order["shippingAddress"] };

function mapOrder(row: OrderRow): Order {
  return { id: row.id, buyerId: row.buyer_id, artworkId: row.artwork_id, editionType: row.edition_type, totalAmount: Number(row.total_amount), currency: row.currency, status: row.status, createdAt: row.created_at, shippingAddress: row.shipping_address };
}

/**
 * Artist ownership of an artwork is Artist & Artwork's data — resolved here
 * over HTTP rather than by joining artist_artwork.artworks from Commerce.
 */
export async function listArtistOrders(artistId: string) {
  const { items: artworks } = await requestInternalService<{ items: { id: string }[] }>(
    "artist-artwork",
    `/v1/artist-artwork/artist/artworks?artistId=${encodeURIComponent(artistId)}`,
  );
  const artworkIds = artworks.map((a) => a.id);
  if (artworkIds.length === 0) return [];

  const rows = await query<
    OrderRow & { shipment_id: string | null; carrier: string | null; tracking_number: string | null; shipment_status: Shipment["status"] | null }
  >(
    `select o.id::text, o.buyer_id::text, o.artwork_id::text, o.edition_type, o.total_amount::text, o.currency, o.status, o.created_at::text, o.shipping_address,
            s.id::text as shipment_id, s.carrier, s.tracking_number, s.status as shipment_status
     from commerce.orders o
     left join commerce.shipments s on s.order_id = o.id
     where o.artwork_id = any($1::uuid[])
     order by o.created_at desc`,
    [artworkIds],
  );
  return rows.map((row) => ({
    ...mapOrder(row),
    shipment: row.shipment_id
      ? { id: row.shipment_id, orderId: row.id, carrier: row.carrier ?? undefined, trackingNumber: row.tracking_number ?? undefined, status: row.shipment_status! }
      : null,
  }));
}

export async function shipOrder(orderId: string, artistId: string, input: { carrier: string; trackingNumber: string }): Promise<Shipment | null> {
  const orders = await query<{ id: string; artwork_id: string }>(`select id::text, artwork_id::text from commerce.orders where id::text = $1`, [orderId]);
  if (!orders[0]) return null;

  const artwork = await requestInternalService<{ artistId: string }>(
    "artist-artwork",
    `/v1/artist-artwork/artworks/${encodeURIComponent(orders[0].artwork_id)}`,
  ).catch(() => null);
  if (!artwork || artwork.artistId !== artistId) return null;

  const shipment = await query<{ id: string }>(
    `insert into commerce.shipments (order_id, carrier, tracking_number, status) values ($1::uuid, $2, $3, 'in_transit')
     on conflict (order_id) do update set carrier = excluded.carrier, tracking_number = excluded.tracking_number, status = 'in_transit', updated_at = now() returning id::text`, [orderId, input.carrier, input.trackingNumber],
  );
  await query(`update commerce.orders set status = 'shipped', updated_at = now() where id::text = $1`, [orderId]);
  return shipment[0] ? { id: shipment[0].id, orderId, carrier: input.carrier, trackingNumber: input.trackingNumber, status: "in_transit" } : null;
}

export async function confirmReceived(orderId: string, buyerId: string): Promise<Order | null> {
  const rows = await query<OrderRow>(
    `update commerce.orders set status = 'completed', updated_at = now()
     where id::text = $1 and buyer_id = $2::uuid and status = 'shipped'
     returning id::text, buyer_id::text, artwork_id::text, edition_type, total_amount::text, currency, status, created_at::text, shipping_address`,
    [orderId, buyerId],
  );
  return rows[0] ? mapOrder(rows[0]) : null;
}

export async function saveReview(input: { orderId: string; buyerId: string; rating: number; comment?: string }): Promise<Review | null> {
  const rows = await query<{ id: string }>(
    `select id::text from commerce.orders where id::text = $1 and buyer_id = $2::uuid and status = 'completed'`,
    [input.orderId, input.buyerId],
  );
  if (!rows[0]) return null;
  const review = await query<{ id: string }>(
    `insert into commerce.reviews (order_id, buyer_id, rating, comment) values ($1::uuid, $2::uuid, $3, $4)
     on conflict (order_id) do update set rating = excluded.rating, comment = excluded.comment, updated_at = now() returning id::text`,
    [input.orderId, input.buyerId, input.rating, input.comment ?? null],
  );
  return review[0] ? { id: review[0].id, orderId: input.orderId, buyerId: input.buyerId, rating: input.rating, ...(input.comment ? { comment: input.comment } : {}) } : null;
}
