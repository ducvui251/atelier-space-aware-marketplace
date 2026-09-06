import { query } from "@atelier/persistence";

export async function getSignals(authUserId: string): Promise<{ savedArtworkIds: Set<string>; followedArtistIds: Set<string> }> {
  const saved = await query<{ artwork_id: string }>(
    `select s.artwork_id::text from recommendation.saved_artworks s
     join account.users u on u.id = s.buyer_id where u.auth_user_id = $1::uuid`, [authUserId],
  );
  const followed = await query<{ artist_id: string }>(
    `select f.artist_id::text from recommendation.follows f
     join account.users u on u.id = f.buyer_id where u.auth_user_id = $1::uuid`, [authUserId],
  );
  return { savedArtworkIds: new Set(saved.map((row) => row.artwork_id)), followedArtistIds: new Set(followed.map((row) => row.artist_id)) };
}

export async function listSavedArtworkIds(authUserId: string): Promise<string[]> {
  const rows = await query<{ artwork_id: string }>(
    `select s.artwork_id::text from recommendation.saved_artworks s
     join account.users u on u.id = s.buyer_id where u.auth_user_id = $1::uuid order by s.created_at desc`, [authUserId],
  );
  return rows.map((row) => row.artwork_id);
}

export async function toggleSaved(authUserId: string, artworkId: string): Promise<boolean> {
  const existing = await query<{ id: string }>(
    `select s.id::text from recommendation.saved_artworks s join account.users u on u.id = s.buyer_id
     where u.auth_user_id = $1::uuid and s.artwork_id = $2::uuid`, [authUserId, artworkId],
  );
  if (existing[0]) {
    await query(`delete from recommendation.saved_artworks where id = $1::uuid`, [existing[0].id]);
    return false;
  }
  await query(
    `insert into recommendation.saved_artworks (buyer_id, artwork_id)
     select u.id, $2::uuid from account.users u where u.auth_user_id = $1::uuid
     on conflict (buyer_id, artwork_id) do nothing`, [authUserId, artworkId],
  );
  return true;
}

export async function toggleFollow(authUserId: string, artistId: string): Promise<boolean> {
  const existing = await query<{ id: string }>(
    `select f.id::text from recommendation.follows f join account.users u on u.id = f.buyer_id
     where u.auth_user_id = $1::uuid and f.artist_id = $2::uuid`, [authUserId, artistId],
  );
  if (existing[0]) {
    await query(`delete from recommendation.follows where id = $1::uuid`, [existing[0].id]);
    return false;
  }
  await query(
    `insert into recommendation.follows (buyer_id, artist_id)
     select u.id, $2::uuid from account.users u where u.auth_user_id = $1::uuid
     on conflict (buyer_id, artist_id) do nothing`, [authUserId, artistId],
  );
  return true;
}
