import { query, transaction } from "@atelier/persistence";

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

/**
 * Writes a follow_events row alongside the follows toggle in the same
 * transaction, so unfollow (a hard delete of the follows row) doesn't
 * erase the ability to reconstruct historical follower counts — see
 * getArtistAudience below.
 */
export async function toggleFollow(buyerId: string, artistId: string): Promise<boolean> {
  return transaction(async (client) => {
    const existing = await client.query<{ id: string }>(
      `select id::text from recommendation.follows where buyer_id = $1::uuid and artist_id = $2::uuid`, [buyerId, artistId],
    );
    if (existing.rows[0]) {
      await client.query(`delete from recommendation.follows where id = $1::uuid`, [existing.rows[0].id]);
      await client.query(
        `insert into recommendation.follow_events (buyer_id, artist_id, event_type) values ($1::uuid, $2::uuid, 'unfollowed')`,
        [buyerId, artistId],
      );
      return false;
    }
    await client.query(
      `insert into recommendation.follows (buyer_id, artist_id) values ($1::uuid, $2::uuid)
       on conflict (buyer_id, artist_id) do nothing`, [buyerId, artistId],
    );
    await client.query(
      `insert into recommendation.follow_events (buyer_id, artist_id, event_type) values ($1::uuid, $2::uuid, 'followed')`,
      [buyerId, artistId],
    );
    return true;
  });
}

/**
 * Audience metric (§4.7): total followers now, plus growth vs the same
 * length period immediately before it. Reconstructs the historical count
 * from follow_events (followed minus unfollowed events up to that point in
 * time) rather than from recommendation.follows, since unfollow deletes
 * that row — the current table can only ever answer "right now".
 */
export async function getArtistAudience(artistId: string, periodDays: number): Promise<{ totalFollowers: number; followersPreviousPeriod: number; growth: number }> {
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
  const rows = await query<{ total_followers: string; followers_previous_period: string }>(
    `select
       (select count(*) from recommendation.follows where artist_id = $1::uuid)::text as total_followers,
       (
         (select count(*) from recommendation.follow_events where artist_id = $1::uuid and event_type = 'followed' and created_at <= $2::timestamptz)
         -
         (select count(*) from recommendation.follow_events where artist_id = $1::uuid and event_type = 'unfollowed' and created_at <= $2::timestamptz)
       )::text as followers_previous_period`,
    [artistId, periodStart],
  );
  const totalFollowers = Number(rows[0]?.total_followers ?? 0);
  const followersPreviousPeriod = Math.max(0, Number(rows[0]?.followers_previous_period ?? 0));
  return { totalFollowers, followersPreviousPeriod, growth: totalFollowers - followersPreviousPeriod };
}

/**
 * Per-artwork save counts for one artist's own artworks (§4.7's "Views và
 * Saves theo artwork"). Artist ownership is resolved over HTTP from
 * Artist & Artwork, same pattern as sourceArtworks() in server.ts —
 * Recommendation never reads artist_artwork.* directly.
 */
export async function getArtistArtworkSaves(artworkIds: string[]): Promise<{ artworkId: string; saves: number }[]> {
  if (artworkIds.length === 0) return [];
  const rows = await query<{ artwork_id: string; saves: string }>(
    `select artwork_id::text, count(*)::text as saves
     from recommendation.saved_artworks
     where artwork_id = any($1::uuid[])
     group by artwork_id`,
    [artworkIds],
  );
  return rows.map((row) => ({ artworkId: row.artwork_id, saves: Number(row.saves) }));
}

/**
 * Record one view for an artwork, visitor and UTC day. The composite primary
 * key is also the idempotency boundary for browser retries and React Strict
 * Mode's development effect replay.
 */
export async function recordArtworkView(input: { artworkId: string; viewedOn: string; viewerHash: string }): Promise<boolean> {
  const rows = await query<{ artwork_id: string }>(
    `insert into recommendation.artwork_views (artwork_id, viewed_on, viewer_hash)
     values ($1::uuid, $2::date, $3)
     on conflict (artwork_id, viewed_on, viewer_hash) do nothing
     returning artwork_id::text`,
    [input.artworkId, input.viewedOn, input.viewerHash],
  );
  return rows.length > 0;
}

/** Aggregate views only for artwork ids resolved by Recommendation over the
 * Artist & Artwork HTTP API; this service never reads another service's DB. */
export async function getArtistArtworkViews(
  artworkIds: string[],
  from: string,
  to: string,
): Promise<{ artworkId: string; views: number }[]> {
  if (artworkIds.length === 0) return [];
  const rows = await query<{ artwork_id: string; views: string }>(
    `select artwork_id::text, count(*)::text as views
     from recommendation.artwork_views
     where artwork_id = any($1::uuid[]) and viewed_on >= $2::date and viewed_on <= $3::date
     group by artwork_id`,
    [artworkIds, from, to],
  );
  return rows.map((row) => ({ artworkId: row.artwork_id, views: Number(row.views) }));
}
