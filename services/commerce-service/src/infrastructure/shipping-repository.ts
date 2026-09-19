import { requestInternalService } from "@atelier/config/service-client";

export interface ArtistOrigin {
  postalCode: string | null;
  country: string | null;
  displayName: string | null;
  phone: string | null;
  email: string | null;
  state: string | null;
}

/**
 * Origin location is Artist & Artwork's data (artist_artwork.artist_profiles),
 * resolved here over HTTP rather than by reading that schema directly —
 * same boundary rule every other cross-service lookup in this file follows.
 * Never lets a lookup failure (artist not found, dependency timeout) break
 * shipping calculation — the caller treats a null origin as "unknown" and
 * falls back accordingly (cross-region rate for the placeholder formula, no
 * Shippo rate lookup at all without a country).
 */
export async function getArtistOrigin(artistId: string): Promise<ArtistOrigin> {
  try {
    const artist = await requestInternalService<{ originPostalCode?: string; originCountry?: string; displayName?: string; originPhone?: string; originEmail?: string; originState?: string }>(
      "artist-artwork",
      `/v1/artist-artwork/artists/${encodeURIComponent(artistId)}`,
    );
    return {
      postalCode: artist.originPostalCode ?? null,
      country: artist.originCountry ?? null,
      displayName: artist.displayName ?? null,
      phone: artist.originPhone ?? null,
      email: artist.originEmail ?? null,
      state: artist.originState ?? null,
    };
  } catch {
    return { postalCode: null, country: null, displayName: null, phone: null, email: null, state: null };
  }
}
