import type { Complaint } from "@atelier/contracts";
import { query } from "@atelier/persistence";

type ComplaintRow = { id: string; order_id: string; reporter_id: string; reason: string; status: Complaint["status"]; resolution_note: string | null };

function mapComplaint(row: ComplaintRow): Complaint {
  return { id: row.id, orderId: row.order_id, reporterId: row.reporter_id, reason: row.reason, status: row.status, ...(row.resolution_note ? { resolutionNote: row.resolution_note } : {}) };
}

export async function listComplaints(): Promise<Complaint[]> {
  const rows = await query<ComplaintRow>(`select c.id::text, c.order_id::text, u.auth_user_id::text as reporter_id, c.reason, c.status, c.resolution_note from admin.complaints c join account.users u on u.id = c.reporter_id order by (c.status = 'open') desc, c.created_at desc`);
  return rows.map(mapComplaint);
}

export async function createComplaint(input: { authUserId: string; orderId: string; reason: string; evidenceUrl?: string }): Promise<Complaint> {
  const rows = await query<ComplaintRow>(
    `insert into admin.complaints (order_id, reporter_id, reason, evidence_url)
     select $2::uuid, u.id, $3, $4 from account.users u where u.auth_user_id = $1::uuid
     returning id::text, order_id::text, reporter_id::text, reason, status, resolution_note`, [input.authUserId, input.orderId, input.reason, input.evidenceUrl ?? null],
  );
  if (!rows[0]) throw new Error("Account profile not found");
  return mapComplaint({ ...rows[0], reporter_id: input.authUserId });
}

export async function resolveComplaint(id: string, status: "resolved" | "rejected", note: string | undefined): Promise<Complaint | null> {
  const rows = await query<ComplaintRow>(
    `update admin.complaints set status = $2, resolution_note = $3, updated_at = now() where id::text = $1
     returning id::text, order_id::text, reporter_id::text, reason, status, resolution_note`, [id, status, note ?? null],
  );
  if (!rows[0]) return null;
  const reporter = await query<{ auth_user_id: string }>(`select auth_user_id::text from account.users where id = $1::uuid`, [rows[0].reporter_id]);
  return mapComplaint({ ...rows[0], reporter_id: reporter[0]?.auth_user_id ?? rows[0].reporter_id });
}

export async function getStats() {
  const [artists, artworks, complaints, orders, revenue] = await Promise.all([
    query<{ count: string }>(`select count(*)::text as count from artist_artwork.artist_profiles where verification_status = 'pending'`),
    query<{ count: string }>(`select count(*)::text as count from artist_artwork.artworks where verification_status = 'pending'`),
    query<{ count: string }>(`select count(*)::text as count from admin.complaints where status = 'open'`),
    query<{ count: string }>(`select count(*)::text as count from commerce.orders`),
    query<{ total: string | null }>(`select coalesce(sum(total_amount) filter (where status <> 'cancelled'), 0)::text as total from commerce.orders`),
  ]);
  return { pendingArtists: Number(artists[0]?.count ?? 0), pendingArtworks: Number(artworks[0]?.count ?? 0), openComplaints: Number(complaints[0]?.count ?? 0), totalOrders: Number(orders[0]?.count ?? 0), revenue: Number(revenue[0]?.total ?? 0) };
}
