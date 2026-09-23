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

/**
 * Phase 6, G-04 — driven by Commerce's PaymentFailed.v1 (itself only
 * emitted from a real Stripe `payment_intent.payment_failed` webhook). Same
 * self-sufficient-upsert shape as `upsertOrderFeedCreated`/`markOrderFeedPaid`:
 * a failure can arrive before this service has ever seen the corresponding
 * OrderCreated event, so this must be able to create the row on its own.
 */
export async function markOrderFeedFailed(input: { orderId: string; buyerId: string; artworkId: string; amount: number; currency: string }): Promise<void> {
  await query(
    `insert into admin.order_feed (order_id, buyer_id, artwork_id, amount, currency, status)
     values ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'failed')
     on conflict (order_id) do update set status = 'failed', amount = excluded.amount, currency = excluded.currency, updated_at = now()`,
    [input.orderId, input.buyerId, input.artworkId, input.amount, input.currency],
  );
}


/**
 * Admin overview chart data (§4.6 of the defect audit). Everything here
 * reads persisted, event-driven data — `admin.order_feed` (populated from
 * Commerce's own OrderCreated/PaymentSucceeded/OrderShipped/PaymentFailed
 * events) and the same artist/artwork/complaint sources getStats already
 * fetches — never a module-level array or a fixture.
 *
 * `order_feed.status` only has pending/paid/shipped/failed — there is no
 * `completed` (buyer-confirmed-receipt never reaches Admin) or `refunded`
 * (charge.refunded isn't consumed here) status in this feed today, so the
 * revenue trend below is "amount collected" (paid or shipped), not a full
 * lifecycle view; a `returned/refunded` series would need Admin to consume
 * a new event first, which is out of scope for this additive pass.
 */
async function getOrderFeedTrend(periodDays: number): Promise<{ period: "day"; from: string; to: string; timezone: "UTC"; currency: string; series: { period: string; amount: number }[] }> {
  const to = new Date();
  const from = new Date(to.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const rows = await query<{ bucket: string; amount: string | null }>(
    `select date_trunc('day', created_at)::text as bucket, coalesce(sum(amount) filter (where status in ('paid', 'shipped')), 0)::text as amount
     from admin.order_feed
     where created_at >= $1::timestamptz and created_at < $2::timestamptz
     group by bucket order by bucket`,
    [from.toISOString(), to.toISOString()],
  );
  return {
    period: "day", from: from.toISOString(), to: to.toISOString(), timezone: "UTC", currency: "USD",
    series: rows.map((row) => ({ period: row.bucket, amount: Number(row.amount ?? 0) })),
  };
}

async function getOrderStatusCounts(): Promise<Record<string, number>> {
  const rows = await query<{ status: string; count: string }>(
    `select status, count(*)::text as count from admin.order_feed group by status`,
  );
  const counts: Record<string, number> = { pending: 0, paid: 0, shipped: 0, failed: 0 };
  for (const row of rows) counts[row.status] = Number(row.count);
  return counts;
}

async function getComplaintStatusCounts(): Promise<Record<string, number>> {
  const rows = await query<{ status: string; count: string }>(
    `select status, count(*)::text as count from admin.complaints group by status`,
  );
  const counts: Record<string, number> = { open: 0, resolved: 0, rejected: 0 };
  for (const row of rows) counts[row.status] = Number(row.count);
  return counts;
}

/**
 * Full order detail (shipping address, shipment/tracking, status) for the
 * Orders management page — admin.order_feed (above) only carries enough for
 * the overview's aggregate counts/trend, not per-order detail, so this
 * proxies straight through to Commerce's own orders table instead of
 * duplicating it here.
 */
export async function getAdminOrders(query_: { status?: string; page: number; limit: number }) {
  const params = new URLSearchParams({ page: String(query_.page), limit: String(query_.limit) });
  if (query_.status) params.set("status", query_.status);
  return requestInternalService<{ items: unknown[]; total: number }>("commerce", `/v1/commerce/orders/admin?${params.toString()}`);
}

/** Artwork verification browser, paginated — proxies to Artist & Artwork, same shape as getAdminOrders above. */
export async function getAdminArtworks(query_: { status?: string; q?: string; page: number; limit: number }) {
  const params = new URLSearchParams({ page: String(query_.page), limit: String(query_.limit) });
  if (query_.status) params.set("status", query_.status);
  if (query_.q) params.set("q", query_.q);
  return requestInternalService<{ items: unknown[]; total: number }>("artist-artwork", `/v1/artist-artwork/artworks/admin?${params.toString()}`);
}

/**
 * Artist verification browser — unlike artworks, the artist roster is small
 * enough (dozens, not thousands) that Artist & Artwork's own unpaginated
 * "everyone" endpoint is fine; filter to the requested status here rather
 * than adding pagination the caller doesn't need.
 */
export async function getAdminArtists(query_: { status?: string }) {
  const result = await requestInternalService<{ items: Array<{ verificationStatus: string }> }>("artist-artwork", "/v1/artist-artwork/artists?status=all");
  const items = query_.status ? result.items.filter((item) => item.verificationStatus === query_.status) : result.items;
  return { items, total: items.length };
}

export async function getStats() {
  const results = await Promise.allSettled([
    requestInternalService<{ artists: Record<string, number>; artworks: Record<string, number> }>("artist-artwork", "/v1/artist-artwork/verification-counts"),
    query<{ count: string }>(`select count(*)::text as count from admin.complaints where status = 'open'`),
    requestInternalService<{ totalOrders: number; revenue: number }>("commerce", "/v1/commerce/stats"),
    getOrderFeedTrend(30),
    getOrderStatusCounts(),
    getComplaintStatusCounts(),
  ]);
  const [verificationResult, complaintsResult, commerceResult, revenueTrendResult, orderStatusResult, complaintStatusResult] = results;
  const emptyStatusCounts = { pending: 0, verified: 0, rejected: 0 };
  const verificationStatusCounts = verificationResult.status === "fulfilled" ? verificationResult.value : { artists: emptyStatusCounts, artworks: emptyStatusCounts };
  const complaints = complaintsResult.status === "fulfilled" ? complaintsResult.value : [];
  const commerceStats = commerceResult.status === "fulfilled" ? commerceResult.value : { totalOrders: 0, revenue: 0 };
  const revenueTrend = revenueTrendResult.status === "fulfilled" ? revenueTrendResult.value : null;
  const orderStatusCounts = orderStatusResult.status === "fulfilled" ? orderStatusResult.value : { pending: 0, paid: 0, shipped: 0, failed: 0 };
  const complaintStatusCounts = complaintStatusResult.status === "fulfilled" ? complaintStatusResult.value : { open: 0, resolved: 0, rejected: 0 };
  return {
    pendingArtists: verificationStatusCounts.artists.pending ?? 0,
    pendingArtworks: verificationStatusCounts.artworks.pending ?? 0,
    openComplaints: Number(complaints[0]?.count ?? 0),
    totalOrders: commerceStats.totalOrders,
    revenue: commerceStats.revenue,
    revenueTrend,
    orderStatusCounts,
    verificationStatusCounts,
    complaintStatusCounts,
  };
}
