import type { Artwork } from "@atelier/contracts";
import { query, transaction } from "@atelier/persistence";

export async function listReadModel(): Promise<Artwork[]> {
  const rows = await query<{ payload: Artwork }>(`select payload from catalog_discovery.artwork_read_models order by (payload->>'title')`);
  return rows.map((row) => row.payload);
}

/**
 * Idempotent full replace: upserts every artwork from the current source
 * snapshot and removes read-model rows no longer present upstream. Safe to
 * call repeatedly (e.g. on a poll interval) — this is the backfill path
 * MICROSERVICE_100_PLAN.md Phase 2 calls for, ahead of Phase 4 wiring it to
 * events instead of a poll.
 */
export async function syncReadModel(artworks: Artwork[]): Promise<void> {
  await transaction(async (client) => {
    const ids = artworks.map((artwork) => artwork.id);
    for (const artwork of artworks) {
      await client.query(
        `insert into catalog_discovery.artwork_read_models (id, payload, synced_at)
         values ($1::uuid, $2::jsonb, now())
         on conflict (id) do update set payload = excluded.payload, synced_at = now()`,
        [artwork.id, JSON.stringify(artwork)],
      );
    }
    if (ids.length > 0) {
      await client.query(`delete from catalog_discovery.artwork_read_models where not (id = any($1::uuid[]))`, [ids]);
    } else {
      await client.query(`delete from catalog_discovery.artwork_read_models`);
    }
  });
}

/**
 * Single-row upsert used by the event consumer — the fast path that keeps
 * the read model fresh within one publish/consume round trip instead of
 * waiting for the next poll tick.
 */
export async function upsertReadModelArtwork(artwork: Artwork): Promise<void> {
  await query(
    `insert into catalog_discovery.artwork_read_models (id, payload, synced_at)
     values ($1::uuid, $2::jsonb, now())
     on conflict (id) do update set payload = excluded.payload, synced_at = now()`,
    [artwork.id, JSON.stringify(artwork)],
  );
}
