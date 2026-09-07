import type { Artist, Artwork } from "@atelier/contracts";
import { query, transaction } from "@atelier/persistence";
import { writeOutboxEvent } from "@atelier/events";

const SCHEMA = "artist_artwork";

type ArtworkRow = {
  id: string; title: string; artist_id: string; artist: string; price: string; currency: string;
  width_cm: string; height_cm: string; medium: string | null; styles: string[]; dominant_colors: string[];
  edition_type: Artwork["editionType"]; availability: Artwork["availability"];
  verification_status: Artwork["verificationStatus"]; image_url: string | null; orientation: Artwork["orientation"];
  creation_year: number | null; description: string | null;
};

type ArtistRow = {
  id: string; user_id: string | null; display_name: string; location: string | null; nationality: string | null;
  bio: string | null; verification_status: Artist["verificationStatus"]; image_url: string | null; portfolio_url: string | null;
};

const artworkSql = `
  select a.id::text, a.title, a.artist_id::text, ap.display_name as artist,
         a.price::text, a.currency, a.width_cm::text, a.height_cm::text, a.medium,
         a.styles, a.dominant_colors, a.edition_type, a.availability, a.verification_status,
         ai.image_url, a.orientation, a.creation_year, a.description
  from artist_artwork.artworks a
  join artist_artwork.artist_profiles ap on ap.id = a.artist_id
  left join lateral (
    select image_url from artist_artwork.artwork_images where artwork_id = a.id order by is_primary desc, created_at limit 1
  ) ai on true
`;

function asStrings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

function mapArtwork(row: ArtworkRow): Artwork {
  return {
    id: row.id, title: row.title, artistId: row.artist_id, artist: row.artist,
    price: Number(row.price), currency: row.currency, widthCm: Number(row.width_cm), heightCm: Number(row.height_cm),
    medium: row.medium ?? "", style: asStrings(row.styles), dominantColors: asStrings(row.dominant_colors),
    editionType: row.edition_type, availability: row.availability, verificationStatus: row.verification_status,
    imageUrl: row.image_url ?? "", orientation: row.orientation, year: row.creation_year ?? 0,
    ...(row.description ? { description: row.description } : {}),
  };
}

function mapArtist(row: ArtistRow): Artist {
  return {
    id: row.id, ...(row.user_id ? { userId: row.user_id } : {}), displayName: row.display_name,
    location: row.location ?? "", nationality: row.nationality ?? "", bio: row.bio ?? "",
    verificationStatus: row.verification_status, imageUrl: row.image_url ?? "", ...(row.portfolio_url ? { portfolioUrl: row.portfolio_url } : {}),
  };
}

export async function listPersistedArtworks(): Promise<Artwork[]> {
  return (await query<ArtworkRow>(artworkSql)).map(mapArtwork);
}

export async function listPersistedArtistArtworks(artistId: string): Promise<Artwork[]> {
  return (await query<ArtworkRow>(`${artworkSql} where a.artist_id::text = $1`, [artistId])).map(mapArtwork);
}

export async function createPersistedArtwork(input: {
  artistId: string; title: string; description?: string; medium: string; widthCm: number; heightCm: number;
  year: number; price: number; currency: string; editionType: Artwork["editionType"]; orientation: Artwork["orientation"];
  dominantColors: string[]; style: string[]; imageUrl: string;
}, correlationId: string): Promise<Artwork> {
  const id = await transaction(async (client) => {
    const inserted = await client.query<{ id: string }>(
      `insert into artist_artwork.artworks (artist_id, title, description, medium, width_cm, height_cm, creation_year, price, currency, edition_type, availability, verification_status, orientation, dominant_colors, styles)
       values ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'available', 'pending', $11, $12::jsonb, $13::jsonb) returning id::text`,
      [input.artistId, input.title, input.description ?? null, input.medium, input.widthCm, input.heightCm, input.year, input.price, input.currency, input.editionType, input.orientation, JSON.stringify(input.dominantColors), JSON.stringify(input.style)],
    );
    const artworkId = inserted.rows[0].id;
    await client.query(`insert into artist_artwork.artwork_images (artwork_id, image_url, is_primary) values ($1::uuid, $2, true)`, [artworkId, input.imageUrl]);
    await writeOutboxEvent(client, SCHEMA, {
      type: "ArtworkPublished",
      aggregateId: artworkId,
      correlationId,
      payload: { artworkId, artistId: input.artistId },
    });
    return artworkId;
  });
  const artwork = await findPersistedArtwork(id);
  if (!artwork) throw new Error("Artwork was not persisted");
  return artwork;
}

export async function updatePersistedArtwork(id: string, input: Partial<Pick<Artwork, "title" | "description" | "medium" | "price" | "widthCm" | "heightCm" | "year" | "currency" | "orientation" | "dominantColors" | "style">>): Promise<Artwork | null> {
  const current = await findPersistedArtwork(id);
  if (!current) return null;
  await query(
    `update artist_artwork.artworks set title = $2, description = $3, medium = $4, price = $5, width_cm = $6, height_cm = $7, creation_year = $8, currency = $9, orientation = $10, dominant_colors = $11::jsonb, styles = $12::jsonb, verification_status = 'pending', updated_at = now() where id::text = $1`,
    [id, input.title ?? current.title, input.description ?? current.description ?? null, input.medium ?? current.medium, input.price ?? current.price, input.widthCm ?? current.widthCm, input.heightCm ?? current.heightCm, input.year ?? current.year, input.currency ?? current.currency, input.orientation ?? current.orientation, JSON.stringify(input.dominantColors ?? current.dominantColors), JSON.stringify(input.style ?? current.style)],
  );
  return findPersistedArtwork(id);
}

export async function findPersistedArtwork(id: string): Promise<Artwork | null> {
  const rows = await query<ArtworkRow>(`${artworkSql} where a.id::text = $1`, [id]);
  return rows[0] ? mapArtwork(rows[0]) : null;
}

export async function listPersistedArtists(): Promise<Artist[]> {
  return (await query<ArtistRow>(`select id::text, user_id::text, display_name, location, nationality, bio, verification_status, image_url, portfolio_url from artist_artwork.artist_profiles`)).map(mapArtist);
}

export async function findPersistedArtist(id: string): Promise<Artist | null> {
  const rows = await query<ArtistRow>(`select id::text, user_id::text, display_name, location, nationality, bio, verification_status, image_url, portfolio_url from artist_artwork.artist_profiles where id::text = $1`, [id]);
  return rows[0] ? mapArtist(rows[0]) : null;
}

/**
 * Looks up the artist profile owned by an Account user id. This is the only
 * legitimate way for other services (Account, in particular) to learn
 * whether a user has an artist profile — no other service may query
 * artist_artwork.artist_profiles directly.
 */
export async function findPersistedArtistByUserId(userId: string): Promise<Artist | null> {
  const rows = await query<ArtistRow>(
    `select id::text, user_id::text, display_name, location, nationality, bio, verification_status, image_url, portfolio_url
     from artist_artwork.artist_profiles where user_id::text = $1`,
    [userId],
  );
  return rows[0] ? mapArtist(rows[0]) : null;
}

export async function updatePersistedArtworkVerification(
  id: string,
  input: { status: Artwork["verificationStatus"]; note?: string; reviewerId?: string },
  correlationId: string,
): Promise<Artwork | null> {
  const updated = await transaction(async (client) => {
    const rows = await client.query<{ id: string }>(
      `update artist_artwork.artworks set verification_status = $2, updated_at = now() where id::text = $1 returning id::text`,
      [id, input.status],
    );
    if (!rows.rows[0]) return false;
    await writeOutboxEvent(client, SCHEMA, {
      type: "ArtworkVerified",
      aggregateId: id,
      correlationId,
      payload: { artworkId: id, status: input.status },
    });
    return true;
  });
  if (!updated) return null;
  return findPersistedArtwork(id);
}

export async function updatePersistedArtistVerification(
  id: string,
  input: { status: Artist["verificationStatus"]; note?: string },
): Promise<Artist | null> {
  const rows = await query<{ id: string }>(
    `update artist_artwork.artist_profiles set verification_status = $2, updated_at = now() where id::text = $1 returning id::text`,
    [id, input.status],
  );
  if (!rows[0]) return null;
  return findPersistedArtist(id);
}

export interface Reservation {
  id: string;
  artworkId: string;
  status: "pending" | "committed" | "released" | "expired";
  expiresAt: string;
}

const RESERVATION_LEASE_MS = Number(process.env.RESERVATION_LEASE_MS ?? 10 * 60_000);

/**
 * Atomic available -> reserved, guarded the same way
 * updatePersistedAvailability always was (a conditional UPDATE only one
 * concurrent caller can match) plus a reservation row recording who holds
 * the lease and until when (MICROSERVICE_100_PLAN.md section 7.3).
 */
export async function reserveArtwork(artworkId: string, buyerId: string, correlationId: string): Promise<Reservation | null> {
  return transaction(async (client) => {
    const artwork = await client.query<{ id: string }>(
      `update artist_artwork.artworks set availability = 'reserved', updated_at = now()
       where id::text = $1 and availability = 'available' returning id::text`,
      [artworkId],
    );
    if (!artwork.rows[0]) return null;
    const expiresAt = new Date(Date.now() + RESERVATION_LEASE_MS).toISOString();
    const reservation = await client.query<{ id: string }>(
      `insert into artist_artwork.inventory_reservations (artwork_id, reserved_by, expires_at)
       values ($1::uuid, $2::uuid, $3) returning id::text`,
      [artworkId, buyerId, expiresAt],
    );
    await writeOutboxEvent(client, SCHEMA, {
      type: "ArtworkReserved",
      aggregateId: artworkId,
      correlationId,
      payload: { artworkId, reservationId: reservation.rows[0].id, expiresAt },
    });
    return { id: reservation.rows[0].id, artworkId, status: "pending", expiresAt };
  });
}

/** Atomic reserved -> sold, only for the matching, unexpired reservation. */
export async function commitReservation(reservationId: string, correlationId: string): Promise<boolean> {
  return transaction(async (client) => {
    const reservation = await client.query<{ artwork_id: string }>(
      `update artist_artwork.inventory_reservations set status = 'committed', updated_at = now()
       where id::text = $1 and status = 'pending' and expires_at > now() returning artwork_id::text`,
      [reservationId],
    );
    if (!reservation.rows[0]) return false;
    const artworkId = reservation.rows[0].artwork_id;
    const artwork = await client.query<{ id: string }>(
      `update artist_artwork.artworks set availability = 'sold', updated_at = now()
       where id::text = $1 and availability = 'reserved' returning id::text`,
      [artworkId],
    );
    if (!artwork.rows[0]) return false;
    await writeOutboxEvent(client, SCHEMA, { type: "ArtworkSold", aggregateId: artworkId, correlationId, payload: { artworkId } });
    return true;
  });
}

/** Release an uncommitted reservation back to available. Idempotent: releasing an already-released/committed/expired reservation is a no-op, not an error. */
export async function releaseReservation(reservationId: string): Promise<void> {
  await transaction(async (client) => {
    const reservation = await client.query<{ artwork_id: string }>(
      `update artist_artwork.inventory_reservations set status = 'released', updated_at = now()
       where id::text = $1 and status = 'pending' returning artwork_id::text`,
      [reservationId],
    );
    if (!reservation.rows[0]) return;
    await client.query(
      `update artist_artwork.artworks set availability = 'available', updated_at = now()
       where id::text = $1 and availability = 'reserved'`,
      [reservation.rows[0].artwork_id],
    );
  });
}

/**
 * Background sweep for reservations whose lease ran out without a
 * commit/release (e.g. the buyer's process crashed mid-checkout). Run on an
 * interval from server.ts, the same pattern as the outbox publisher.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const expired = await query<{ id: string; artwork_id: string }>(
    `update artist_artwork.inventory_reservations set status = 'expired', updated_at = now()
     where status = 'pending' and expires_at <= now()
     returning id::text, artwork_id::text`,
  );
  for (const row of expired) {
    await query(
      `update artist_artwork.artworks set availability = 'available', updated_at = now()
       where id::text = $1 and availability = 'reserved'`,
      [row.artwork_id],
    );
  }
  return expired.length;
}

export async function updatePersistedAvailability(id: string, availability: Artwork["availability"], correlationId: string): Promise<boolean> {
  return transaction(async (client) => {
    const rows = await client.query<{ id: string }>(
      `update artist_artwork.artworks set availability = $2, updated_at = now()
       where id::text = $1 and ($2 <> 'sold' or availability = 'available') returning id::text`, [id, availability],
    );
    if (!rows.rows[0]) return false;
    if (availability === "sold") {
      await writeOutboxEvent(client, SCHEMA, {
        type: "ArtworkSold",
        aggregateId: id,
        correlationId,
        payload: { artworkId: id },
      });
    }
    return true;
  });
}
