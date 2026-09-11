import { transaction } from "@atelier/persistence";
import { InternalServiceError, requestInternalService } from "@atelier/config/service-client";
import { writeOutboxEvent } from "@atelier/events";

const SCHEMA = "verification";

async function findOrNull<T>(path: string, correlationId: string): Promise<T | null> {
  try {
    return await requestInternalService<T>("artist-artwork", path, { correlationId });
  } catch (error) {
    if (error instanceof InternalServiceError && error.status === 404) return null;
    throw error;
  }
}

/**
 * Verification now owns its decision durably: the audit-trail insert and
 * the outbox event that will drive Artist & Artwork's projection are
 * written in the same local transaction (Phase 5, G-22). The old sequence
 * — PATCH artist-artwork synchronously, then insert the decision — could
 * leave a projection updated with no durable record of the decision (crash
 * between the two steps), or a decision recorded with a stale projection
 * (PATCH failed). This still checks existence first (a plain GET, not a
 * write) so the 404 contract callers already depend on is unchanged.
 */
export async function reviewArtwork(input: { artworkId: string; reviewerAuthUserId: string; status: "verified" | "rejected"; note?: string; coaUrl?: string }, correlationId: string) {
  const artwork = await findOrNull<{ id: string }>(`/v1/artist-artwork/artworks/${encodeURIComponent(input.artworkId)}`, correlationId);
  if (!artwork) return null;

  await transaction(async (client) => {
    await client.query(
      `insert into verification.artwork_verifications (artwork_id, reviewer_id, status, coa_url, note, verified_at) values ($1::uuid, $2::uuid, $3, $4, $5, now())`,
      [input.artworkId, input.reviewerAuthUserId, input.status, input.coaUrl ?? null, input.note ?? null],
    );
    await writeOutboxEvent(client, SCHEMA, {
      type: "ArtworkVerified",
      aggregateId: input.artworkId,
      correlationId,
      payload: { artworkId: input.artworkId, status: input.status, reviewerId: input.reviewerAuthUserId, note: input.note },
    });
  });

  return { id: input.artworkId, verificationStatus: input.status, verificationNote: input.note, reviewedBy: input.reviewerAuthUserId };
}

export async function reviewArtist(input: { artistId: string; status: "verified" | "rejected"; note?: string }, correlationId: string) {
  const artist = await findOrNull<{ id: string }>(`/v1/artist-artwork/artists/${encodeURIComponent(input.artistId)}`, correlationId);
  if (!artist) return null;

  await transaction(async (client) => {
    await client.query(
      `insert into verification.artist_verifications (artist_id, status, note, verified_at) values ($1::uuid, $2, $3, now())`,
      [input.artistId, input.status, input.note ?? null],
    );
    await writeOutboxEvent(client, SCHEMA, {
      type: "ArtistVerified",
      aggregateId: input.artistId,
      correlationId,
      payload: { artistId: input.artistId, status: input.status, note: input.note },
    });
  });

  return { id: input.artistId, verificationStatus: input.status, verificationNote: input.note };
}
