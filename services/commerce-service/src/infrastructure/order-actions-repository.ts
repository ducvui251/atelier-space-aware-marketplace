import type { Artwork, Order, Review, Shipment, ShipmentTracking } from "@atelier/contracts";
import { query, transaction } from "@atelier/persistence";
import { requestInternalService } from "@atelier/config/service-client";
import { writeOutboxEvent } from "@atelier/events";
import { getArtistOrigin } from "./shipping-repository.ts";
import { resolveWaybill } from "../domain/waybill.ts";
import { getTrackingStatus } from "./shippo-client.ts";

const SCHEMA = "commerce";

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
    OrderRow & { shipment_id: string | null; carrier: string | null; tracking_number: string | null; tracking_url: string | null; label_url: string | null; shipment_status: Shipment["status"] | null }
  >(
    `select o.id::text, o.buyer_id::text, o.artwork_id::text, o.edition_type, o.total_amount::text, o.currency, o.status, o.created_at::text, o.shipping_address,
            s.id::text as shipment_id, s.carrier, s.tracking_number, s.tracking_url, s.label_url, s.status as shipment_status
     from commerce.orders o
     left join commerce.shipments s on s.order_id = o.id
     where o.artwork_id = any($1::uuid[])
     order by o.created_at desc`,
    [artworkIds],
  );
  return rows.map((row) => ({
    ...mapOrder(row),
    shipment: row.shipment_id
      ? { id: row.shipment_id, orderId: row.id, carrier: row.carrier ?? undefined, trackingNumber: row.tracking_number ?? undefined, trackingUrl: row.tracking_url ?? undefined, labelUrl: row.label_url ?? undefined, status: row.shipment_status! }
      : null,
  }));
}

/**
 * The waybill (carrier/tracking, now also a tracking URL and label) is no
 * longer supplied by the caller — resolveWaybill() gets a real Shippo label
 * when possible and a simulated one otherwise (see domain/waybill.ts). This
 * function already had the order and artwork loaded for the ownership
 * check, so it resolves the waybill right here rather than making the
 * route re-fetch the same data.
 */
export async function shipOrder(orderId: string, artistId: string, correlationId: string): Promise<Shipment | null> {
  const orders = await query<{ id: string; artwork_id: string; shipping_address: Order["shippingAddress"] }>(
    `select id::text, artwork_id::text, shipping_address from commerce.orders where id::text = $1`, [orderId],
  );
  if (!orders[0]) return null;

  const artwork = await requestInternalService<Artwork>(
    "artist-artwork",
    `/v1/artist-artwork/artworks/${encodeURIComponent(orders[0].artwork_id)}`,
  ).catch(() => null);
  if (!artwork || artwork.artistId !== artistId) return null;

  const address = orders[0].shipping_address;
  const origin = await getArtistOrigin(artistId);
  const waybill = await resolveWaybill(
    orderId,
    { widthCm: artwork.widthCm, heightCm: artwork.heightCm, packageWeightGrams: artwork.packageWeightGrams },
    { name: origin.displayName ?? "Artist", postalCode: origin.postalCode, country: origin.country, phone: origin.phone, email: origin.email, state: origin.state },
    { name: address.fullName, street1: address.address, city: address.city, postalCode: address.postalCode ?? "", country: address.country ?? "", phone: address.phone, state: address.state },
  );

  return transaction(async (client) => {
    const shipment = await client.query<{ id: string }>(
      `insert into commerce.shipments (order_id, carrier, tracking_number, tracking_url, label_url, status) values ($1::uuid, $2, $3, $4, $5, 'in_transit')
       on conflict (order_id) do update set carrier = excluded.carrier, tracking_number = excluded.tracking_number, tracking_url = excluded.tracking_url, label_url = excluded.label_url, status = 'in_transit', updated_at = now() returning id::text`,
      [orderId, waybill.carrier, waybill.trackingNumber, waybill.trackingUrl ?? null, waybill.labelUrl ?? null],
    );
    if (!shipment.rows[0]) return null;
    await client.query(`update commerce.orders set status = 'shipped', updated_at = now() where id::text = $1`, [orderId]);
    // Re-shipping (updated tracking info) legitimately re-emits — Admin's
    // update is a plain overwrite, so a repeat event is harmless.
    await writeOutboxEvent(client, SCHEMA, {
      type: "OrderShipped",
      aggregateId: orderId,
      correlationId,
      payload: { orderId, shipmentId: shipment.rows[0].id, carrier: waybill.carrier, trackingNumber: waybill.trackingNumber },
    });
    return { id: shipment.rows[0].id, orderId, carrier: waybill.carrier, trackingNumber: waybill.trackingNumber, trackingUrl: waybill.trackingUrl, labelUrl: waybill.labelUrl, status: "in_transit" as const };
  });
}

/**
 * The carrier column stores a human label like "USPS Ground Advantage"
 * (see purchaseLabel in shippo-client.ts) — Shippo's tracking endpoint wants
 * just the lowercase carrier slug ("usps"), which is always its first word.
 */
function carrierSlug(carrier: string): string {
  return carrier.split(" ")[0]?.toLowerCase() ?? carrier.toLowerCase();
}

/**
 * Ownership is checked here rather than trusted from the caller: a buyer
 * may only look up their own order, an artist only one for their own
 * artwork (same cross-service check shipOrder already does).
 */
export async function getOrderTrackingStatus(orderId: string, requester: { buyerId?: string; artistId?: string }): Promise<ShipmentTracking | null> {
  const rows = await query<{ buyer_id: string; artwork_id: string; carrier: string | null; tracking_number: string | null }>(
    `select o.buyer_id::text, o.artwork_id::text, s.carrier, s.tracking_number
     from commerce.orders o
     left join commerce.shipments s on s.order_id = o.id
     where o.id::text = $1`,
    [orderId],
  );
  const row = rows[0];
  if (!row || !row.carrier || !row.tracking_number) return null;

  if (requester.buyerId) {
    if (row.buyer_id !== requester.buyerId) return null;
  } else if (requester.artistId) {
    const artwork = await requestInternalService<Artwork>(
      "artist-artwork",
      `/v1/artist-artwork/artworks/${encodeURIComponent(row.artwork_id)}`,
    ).catch(() => null);
    if (!artwork || artwork.artistId !== requester.artistId) return null;
  } else {
    return null;
  }

  return getTrackingStatus(carrierSlug(row.carrier), row.tracking_number);
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
