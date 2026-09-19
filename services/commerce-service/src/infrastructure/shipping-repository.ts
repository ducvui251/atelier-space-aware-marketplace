import { requestInternalService } from "@atelier/config/service-client";

/**
 * Origin location is Artist & Artwork's data (artist_artwork.artist_profiles),
 * resolved here over HTTP rather than by reading that schema directly —
 * same boundary rule every other cross-service lookup in this file follows.
 * Never lets a lookup failure (artist not found, dependency timeout) break
 * shipping calculation — the caller treats a null origin as "unknown region"
 * and falls back to the cross-region rate, same as a genuinely unset one.
 */
export async function getArtistOriginPostalCode(artistId: string): Promise<string | null> {
  try {
    const artist = await requestInternalService<{ originPostalCode?: string }>(
      "artist-artwork",
      `/v1/artist-artwork/artists/${encodeURIComponent(artistId)}`,
    );
    return artist.originPostalCode ?? null;
  } catch {
    return null;
  }
}
