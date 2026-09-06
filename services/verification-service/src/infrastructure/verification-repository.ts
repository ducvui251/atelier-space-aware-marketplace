import { query } from "@atelier/persistence";

export async function reviewArtwork(input: { artworkId: string; reviewerAuthUserId: string; status: "verified" | "rejected"; note?: string; coaUrl?: string }) {
  const reviewer = await query<{ id: string }>(`select id::text from account.users where auth_user_id = $1::uuid`, [input.reviewerAuthUserId]);
  if (!reviewer[0]) throw new Error("Reviewer account not found");
  const updated = await query<{ id: string; verification_status: string }>(`update artist_artwork.artworks set verification_status = $2, updated_at = now() where id::text = $1 returning id::text, verification_status`, [input.artworkId, input.status]);
  if (!updated[0]) return null;
  await query(`insert into verification.artwork_verifications (artwork_id, reviewer_id, status, coa_url, note, verified_at) values ($1::uuid, $2::uuid, $3, $4, $5, now())`, [input.artworkId, reviewer[0].id, input.status, input.coaUrl ?? null, input.note ?? null]);
  return { id: updated[0].id, verificationStatus: updated[0].verification_status, verificationNote: input.note, reviewedBy: input.reviewerAuthUserId };
}

export async function reviewArtist(input: { artistId: string; status: "verified" | "rejected"; note?: string }) {
  const rows = await query<{ id: string; verification_status: string }>(`update artist_artwork.artist_profiles set verification_status = $2, updated_at = now() where id::text = $1 returning id::text, verification_status`, [input.artistId, input.status]);
  return rows[0] ? { id: rows[0].id, verificationStatus: rows[0].verification_status, verificationNote: input.note } : null;
}
