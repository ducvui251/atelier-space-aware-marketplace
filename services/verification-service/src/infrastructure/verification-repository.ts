import { query } from "@atelier/persistence";
import { InternalServiceError, requestInternalService } from "@atelier/config/service-client";

async function patchOrNull<T>(path: string, body: unknown): Promise<T | null> {
  try {
    return await requestInternalService<T>("artist-artwork", path, { method: "PATCH", body });
  } catch (error) {
    if (error instanceof InternalServiceError && error.status === 404) return null;
    throw error;
  }
}

export async function reviewArtwork(input: { artworkId: string; reviewerAuthUserId: string; status: "verified" | "rejected"; note?: string; coaUrl?: string }) {
  // Verification owns the decision and its audit trail; the reviewer id is
  // caller-supplied data (not read from account.users), and the artwork's
  // projection is updated through Artist & Artwork's own contract, not a
  // direct write into its schema.
  const updated = await patchOrNull<{ id: string; verificationStatus: string }>(
    `/v1/artist-artwork/artworks/${encodeURIComponent(input.artworkId)}/verification`,
    { status: input.status, note: input.note, reviewerId: input.reviewerAuthUserId },
  );
  if (!updated) return null;

  await query(
    `insert into verification.artwork_verifications (artwork_id, reviewer_id, status, coa_url, note, verified_at) values ($1::uuid, $2::uuid, $3, $4, $5, now())`,
    [input.artworkId, input.reviewerAuthUserId, input.status, input.coaUrl ?? null, input.note ?? null],
  );
  return { id: updated.id, verificationStatus: updated.verificationStatus, verificationNote: input.note, reviewedBy: input.reviewerAuthUserId };
}

export async function reviewArtist(input: { artistId: string; status: "verified" | "rejected"; note?: string }) {
  const updated = await patchOrNull<{ id: string; verificationStatus: string }>(
    `/v1/artist-artwork/artists/${encodeURIComponent(input.artistId)}/verification`,
    { status: input.status, note: input.note },
  );
  if (!updated) return null;

  await query(
    `insert into verification.artist_verifications (artist_id, status, note, verified_at) values ($1::uuid, $2, $3, now())`,
    [input.artistId, input.status, input.note ?? null],
  );
  return { id: updated.id, verificationStatus: updated.verificationStatus, verificationNote: input.note };
}
