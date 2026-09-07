import { query } from "@atelier/persistence";

/**
 * buyer_id stores the caller-supplied Supabase auth user id directly (same
 * convention as commerce.orders.buyer_id) — Recommendation does not join
 * account.users to resolve it.
 */
export async function getSignals(buyerId: string): Promise<{ savedArtworkIds: Set<string>; followedArtistIds: Set<string> }> {
  const saved = await query<{ artwork_id: string }>(
    `select artwork_id::text from recommendation.saved_artworks where buyer_id = $1::uuid`, [buyerId],
  );
  const followed = await query<{ artist_id: string }>(
    `select artist_id::text from recommendation.follows where buyer_id = $1::uuid`, [buyerId],
  );
  return { savedArtworkIds: new Set(saved.map((row) => row.artwork_id)), followedArtistIds: new Set(followed.map((row) => row.artist_id)) };
}

export async function listFollowedArtistIds(buyerId: string): Promise<string[]> {
  const rows = await query<{ artist_id: string }>(
    `select artist_id::text from recommendation.follows where buyer_id = $1::uuid order by created_at desc`, [buyerId],
  );
  return rows.map((row) => row.artist_id);
}

export async function listSavedArtworkIds(buyerId: string): Promise<string[]> {
  const rows = await query<{ artwork_id: string }>(
    `select artwork_id::text from recommendation.saved_artworks where buyer_id = $1::uuid order by created_at desc`, [buyerId],
  );
  return rows.map((row) => row.artwork_id);
}

export async function toggleSaved(buyerId: string, artworkId: string): Promise<boolean> {
  const existing = await query<{ id: string }>(
    `select id::text from recommendation.saved_artworks where buyer_id = $1::uuid and artwork_id = $2::uuid`, [buyerId, artworkId],
  );
  if (existing[0]) {
    await query(`delete from recommendation.saved_artworks where id = $1::uuid`, [existing[0].id]);
    return false;
  }
  await query(
    `insert into recommendation.saved_artworks (buyer_id, artwork_id) values ($1::uuid, $2::uuid)
     on conflict (buyer_id, artwork_id) do nothing`, [buyerId, artworkId],
  );
  return true;
}

export async function toggleFollow(buyerId: string, artistId: string): Promise<boolean> {
  const existing = await query<{ id: string }>(
    `select id::text from recommendation.follows where buyer_id = $1::uuid and artist_id = $2::uuid`, [buyerId, artistId],
  );
  if (existing[0]) {
    await query(`delete from recommendation.follows where id = $1::uuid`, [existing[0].id]);
    return false;
  }
  await query(
    `insert into recommendation.follows (buyer_id, artist_id) values ($1::uuid, $2::uuid)
     on conflict (buyer_id, artist_id) do nothing`, [buyerId, artistId],
  );
  return true;
}
