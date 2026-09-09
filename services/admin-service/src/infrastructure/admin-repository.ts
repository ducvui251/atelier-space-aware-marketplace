import type { Complaint } from "@atelier/contracts";
import { query } from "@atelier/persistence";
import { requestInternalService } from "@atelier/config/service-client";

type ComplaintRow = { id: string; order_id: string; reporter_id: string; reason: string; status: Complaint["status"]; resolution_note: string | null };

function mapComplaint(row: ComplaintRow): Complaint {
  return { id: row.id, orderId: row.order_id, reporterId: row.reporter_id, reason: row.reason, status: row.status, ...(row.resolution_note ? { resolutionNote: row.resolution_note } : {}) };
}

/**
 * reporter_id stores the caller-supplied Supabase auth user id directly
 * (same convention as commerce.orders.buyer_id) — Admin does not join
 * account.users to resolve it.
 */
export async function listComplaints(): Promise<Complaint[]> {
  const rows = await query<ComplaintRow>(
    `select id::text, order_id::text, reporter_id::text, reason, status, resolution_note
     from admin.complaints order by (status = 'open') desc, created_at desc`,
  );
  return rows.map(mapComplaint);
}

export async function createComplaint(input: { authUserId: string; orderId: string; reason: string; evidenceUrl?: string }): Promise<Complaint> {
  const rows = await query<ComplaintRow>(
    `insert into admin.complaints (order_id, reporter_id, reason, evidence_url)
     values ($2::uuid, $1::uuid, $3, $4)
     returning id::text, order_id::text, reporter_id::text, reason, status, resolution_note`,
    [input.authUserId, input.orderId, input.reason, input.evidenceUrl ?? null],
  );
  return mapComplaint(rows[0]);
}

export async function resolveComplaint(id: string, status: "resolved" | "rejected", note: string | undefined): Promise<Complaint | null> {
  const rows = await query<ComplaintRow>(
    `update admin.complaints set status = $2, resolution_note = $3, updated_at = now() where id::text = $1
     returning id::text, order_id::text, reporter_id::text, reason, status, resolution_note`, [id, status, note ?? null],
  );
  return rows[0] ? mapComplaint(rows[0]) : null;
}

/**
 * Populated from Commerce's OrderCreated.v1/PaymentSucceeded.v1 events
 * (Phase 5), not read here — this is the write side the event consumer
 * calls. Each upsert only touches the fields its own event actually
 * knows about; `status` is set unconditionally by whichever event this
 * is, but never regressed by the *other* event arriving out of order
 * (OrderCreated's upsert never overwrites an existing row's status).
 */
export async function upsertOrderFeedCreated(input: { orderId: string; buyerId: string; artworkId: string; amount: number; currency: string }): Promise<void> {
  await query(
    `insert into admin.order_feed (order_id, buyer_id, artwork_id, amount, currency, status)
     values ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'pending')
     on conflict (order_id) do update set buyer_id = excluded.buyer_id, artwork_id = excluded.artwork_id, amount = excluded.amount, currency = excluded.currency, updated_at = now()`,
    [input.orderId, input.buyerId, input.artworkId, input.amount, input.currency],
  );
}

export async function markOrderFeedPaid(input: { orderId: string; buyerId: string; artworkId: string; amount: number; currency: string }): Promise<void> {
  await query(
    `insert into admin.order_feed (order_id, buyer_id, artwork_id, amount, currency, status)
     values ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'paid')
     on conflict (order_id) do update set status = 'paid', amount = excluded.amount, currency = excluded.currency, updated_at = now()`,
    [input.orderId, input.buyerId, input.artworkId, input.amount, input.currency],
  );
}

/**
 * OrderShipped can only occur for an order that already exists (Commerce's
 * shipOrder requires an existing order row), so unlike the two functions
 * above this is a plain UPDATE, not a self-sufficient upsert — there's no
 * real out-of-order-delivery case to defend against here.
 */
export async function markOrderFeedShipped(input: { orderId: string }): Promise<void> {
  await query(`update admin.order_feed set status = 'shipped', updated_at = now() where order_id = $1::uuid`, [input.orderId]);
}

export async function getStats() {
  const [artists, artworks, complaints, commerceStats] = await Promise.all([
    requestInternalService<{ items: Array<{ verificationStatus: string }> }>("artist-artwork", "/v1/artist-artwork/artists"),
    requestInternalService<{ items: Array<{ verificationStatus: string }> }>("artist-artwork", "/v1/artist-artwork/artworks"),
    query<{ count: string }>(`select count(*)::text as count from admin.complaints where status = 'open'`),
    requestInternalService<{ totalOrders: number; revenue: number }>("commerce", "/v1/commerce/stats"),
  ]);
  return {
    pendingArtists: artists.items.filter((item) => item.verificationStatus === "pending").length,
    pendingArtworks: artworks.items.filter((item) => item.verificationStatus === "pending").length,
    openComplaints: Number(complaints[0]?.count ?? 0),
    totalOrders: commerceStats.totalOrders,
    revenue: commerceStats.revenue,
  };
}
