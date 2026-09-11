import type { ArtistEarnings, Order } from "@atelier/contracts";
import { query } from "@atelier/persistence";
import { requestInternalService } from "@atelier/config/service-client";

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

/**
 * Per-artist earnings aggregate (§4.7 of the defect audit). Artist
 * ownership is resolved over HTTP, same as listArtistOrders below — Commerce
 * never reads artist_artwork.* directly. See the ArtistEarnings contract
 * type for why "received" means "payment succeeded, not refunded" rather
 * than an actual payout/settlement signal: this system has no payout
 * integration to report on.
 */
export async function getArtistEarnings(
  artistId: string,
  options: { period: "day" | "week" | "month"; from: string; to: string },
): Promise<ArtistEarnings> {
  const { items: artworks } = await requestInternalService<{ items: { id: string }[] }>(
    "artist-artwork",
    `/v1/artist-artwork/artist/artworks?artistId=${encodeURIComponent(artistId)}`,
  );
  const artworkIds = artworks.map((a) => a.id);
  const empty: ArtistEarnings = {
    artistId, currency: "USD", period: options.period, from: options.from, to: options.to,
    received: 0, pendingPayment: 0, refunded: 0,
    orderCounts: { processing: 0, shipped: 0, completed: 0, cancelled: 0, refunded: 0 },
    trend: [],
  };
  if (artworkIds.length === 0) return empty;

  const totals = await query<{
    received: string | null; pending_payment: string | null; refunded: string | null;
    processing: string; shipped: string; completed: string; cancelled: string; refunded_count: string;
  }>(
    // Order status never changes on a refund (charge.refunded only marks
    // the payment row) — a refunded order otherwise reads as "paid" or
    // "completed" forever. So `refunded` here takes precedence over the
    // order-status bucket, making the five counts mutually exclusive and
    // summable to the total, as the audit's own Orders metric expects.
    `select
       coalesce(sum(o.total_amount) filter (where p.status = 'success'), 0)::text as received,
       coalesce(sum(o.total_amount) filter (where p.status is null or p.status = 'pending'), 0)::text as pending_payment,
       coalesce(sum(o.total_amount) filter (where p.status = 'refunded'), 0)::text as refunded,
       count(*) filter (where p.status is distinct from 'refunded' and o.status in ('pending', 'confirmed', 'paid'))::text as processing,
       count(*) filter (where p.status is distinct from 'refunded' and o.status = 'shipped')::text as shipped,
       count(*) filter (where p.status is distinct from 'refunded' and o.status = 'completed')::text as completed,
       count(*) filter (where p.status is distinct from 'refunded' and o.status = 'cancelled')::text as cancelled,
       count(*) filter (where p.status = 'refunded')::text as refunded_count
     from commerce.orders o
     left join commerce.payments p on p.order_id = o.id
     where o.artwork_id = any($1::uuid[]) and o.created_at >= $2::timestamptz and o.created_at < $3::timestamptz`,
    [artworkIds, options.from, options.to],
  );

  const trendRows = await query<{ bucket: string; net: string | null }>(
    `select date_trunc($4, o.created_at)::text as bucket,
            coalesce(sum(o.total_amount) filter (where p.status = 'success'), 0)::text as net
     from commerce.orders o
     left join commerce.payments p on p.order_id = o.id
     where o.artwork_id = any($1::uuid[]) and o.created_at >= $2::timestamptz and o.created_at < $3::timestamptz
     group by bucket order by bucket`,
    [artworkIds, options.from, options.to, options.period],
  );

  const row = totals[0];
  return {
    artistId, currency: "USD", period: options.period, from: options.from, to: options.to,
    received: Number(row?.received ?? 0),
    pendingPayment: Number(row?.pending_payment ?? 0),
    refunded: Number(row?.refunded ?? 0),
    orderCounts: {
      processing: Number(row?.processing ?? 0),
      shipped: Number(row?.shipped ?? 0),
      completed: Number(row?.completed ?? 0),
      cancelled: Number(row?.cancelled ?? 0),
      refunded: Number(row?.refunded_count ?? 0),
    },
    trend: trendRows.map((t) => ({ period: t.bucket, net: Number(t.net ?? 0) })),
  };
}
