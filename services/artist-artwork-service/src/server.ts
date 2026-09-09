import { createServiceServer, getPort, readJson, writeServiceError, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { ArtworkArtistVerificationRequestSchema, ArtworkAvailabilityRequestSchema, ArtworkCreateRequestSchema, ArtworkUpdateRequestSchema, CreateReservationRequestSchema, EnsureArtistProfileRequestSchema, parseBody } from "@atelier/contracts";
import { ArtistVerifiedPayloadSchema, ArtworkVerifiedPayloadSchema } from "@atelier/contracts/events";
import { consumeEvents, runOutboxPublisher, type ConsumedEvent } from "@atelier/events";
import { ping } from "@atelier/persistence";
import { health } from "./health.ts";
import { commitReservation, createPersistedArtwork, ensureArtistProfile, findPersistedArtist, findPersistedArtistByUserId, findPersistedArtwork, listPersistedArtistArtworks, listPersistedArtists, listPersistedArtworks, releaseExpiredReservations, releaseReservation, reserveArtwork, updatePersistedArtistVerification, updatePersistedArtwork, updatePersistedArtworkVerification, updatePersistedAvailability } from "./infrastructure/catalog-repository.ts";

function validationError(response: Parameters<ServiceRouteHandler>[0]["response"], correlationId: string, parsed: { code: "VALIDATION_ERROR"; message: string; field?: string }) {
  return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
}

const routes: Record<string, ServiceRouteHandler> = {
  "GET /v1/artist-artwork/artworks": async ({ response, correlationId }) => writeServiceJson(response, 200, { items: await listPersistedArtworks() }, correlationId),
  "GET /v1/artist-artwork/artist/artworks": async ({ url, response, correlationId }) => {
    const artistId = url.searchParams.get("artistId");
    if (!artistId) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "artistId is required", correlationId, field: "artistId", retryable: false });
    return writeServiceJson(response, 200, { items: await listPersistedArtistArtworks(artistId) }, correlationId);
  },
  "GET /v1/artist-artwork/artworks/:id": async ({ url, response, correlationId }) => {
    const artwork = await findPersistedArtwork(url.pathname.split("/").pop() ?? "");
    return artwork ? writeServiceJson(response, 200, artwork, correlationId) : writeServiceError(response, 404, { code: "NOT_FOUND", message: "Artwork not found", correlationId, retryable: false });
  },
  "GET /v1/artist-artwork/artists": async ({ response, correlationId }) => writeServiceJson(response, 200, { items: await listPersistedArtists() }, correlationId),
  "GET /v1/artist-artwork/artists/by-user/:userId": async ({ url, response, correlationId }) => {
    const artist = await findPersistedArtistByUserId(url.pathname.split("/").pop() ?? "");
    return artist ? writeServiceJson(response, 200, artist, correlationId) : writeServiceError(response, 404, { code: "NOT_FOUND", message: "No artist profile for this user", correlationId, retryable: false });
  },
  "POST /v1/artist-artwork/artists/by-user/:userId": async ({ request, url, response, correlationId }) => {
    const parsed = parseBody(EnsureArtistProfileRequestSchema, await readJson(request));
    if (!parsed.success) return validationError(response, correlationId, parsed);
    const userId = url.pathname.split("/").pop() ?? "";
    const artist = await ensureArtistProfile(userId, parsed.data.displayName);
    return writeServiceJson(response, 200, artist, correlationId);
  },
  "GET /v1/artist-artwork/artists/:id": async ({ url, response, correlationId }) => {
    const artist = await findPersistedArtist(url.pathname.split("/").pop() ?? "");
    return artist ? writeServiceJson(response, 200, artist, correlationId) : writeServiceError(response, 404, { code: "NOT_FOUND", message: "Artist not found", correlationId, retryable: false });
  },
  "PATCH /v1/artist-artwork/artworks/:id/verification": async ({ request, url, response, correlationId }) => {
    const parsed = parseBody(ArtworkArtistVerificationRequestSchema, await readJson(request));
    if (!parsed.success) return validationError(response, correlationId, parsed);
    const id = url.pathname.split("/")[4] ?? "";
    const artwork = await updatePersistedArtworkVerification(id, parsed.data, correlationId);
    return artwork ? writeServiceJson(response, 200, artwork, correlationId) : writeServiceError(response, 404, { code: "NOT_FOUND", message: "Artwork not found", correlationId, retryable: false });
  },
  "PATCH /v1/artist-artwork/artists/:id/verification": async ({ request, url, response, correlationId }) => {
    const parsed = parseBody(ArtworkArtistVerificationRequestSchema, await readJson(request));
    if (!parsed.success) return validationError(response, correlationId, parsed);
    const id = url.pathname.split("/")[4] ?? "";
    const artist = await updatePersistedArtistVerification(id, parsed.data, correlationId);
    return artist ? writeServiceJson(response, 200, artist, correlationId) : writeServiceError(response, 404, { code: "NOT_FOUND", message: "Artist not found", correlationId, retryable: false });
  },
  "PATCH /v1/artist-artwork/artworks/:id/availability": async ({ request, url, response, correlationId }) => {
    const parsed = parseBody(ArtworkAvailabilityRequestSchema, await readJson(request));
    if (!parsed.success) return validationError(response, correlationId, parsed);
    const updated = await updatePersistedAvailability(url.pathname.split("/")[4] ?? "", parsed.data.availability, correlationId);
    return updated ? writeServiceJson(response, 200, { availability: parsed.data.availability }, correlationId) : writeServiceError(response, 409, { code: "CONFLICT", message: "Artwork is no longer available", correlationId, retryable: false });
  },
  "POST /v1/artist-artwork/artworks": async ({ request, response, correlationId }) => {
    const parsed = parseBody(ArtworkCreateRequestSchema, await readJson(request));
    if (!parsed.success) return validationError(response, correlationId, parsed);
    const artwork = await createPersistedArtwork(parsed.data, correlationId);
    return writeServiceJson(response, 201, artwork, correlationId);
  },
  "PATCH /v1/artist-artwork/artworks/:id": async ({ request, url, response, correlationId }) => {
    const parsed = parseBody(ArtworkUpdateRequestSchema, await readJson(request));
    if (!parsed.success) return validationError(response, correlationId, parsed);
    const artwork = await updatePersistedArtwork(url.pathname.split("/").pop() ?? "", parsed.data);
    return artwork ? writeServiceJson(response, 200, artwork, correlationId) : writeServiceError(response, 404, { code: "NOT_FOUND", message: "Artwork not found", correlationId, retryable: false });
  },
  "POST /v1/artist-artwork/reservations": async ({ request, response, correlationId }) => {
    const parsed = parseBody(CreateReservationRequestSchema, await readJson(request));
    if (!parsed.success) return validationError(response, correlationId, parsed);
    const reservation = await reserveArtwork(parsed.data.artworkId, parsed.data.buyerId, correlationId);
    return reservation ? writeServiceJson(response, 201, reservation, correlationId) : writeServiceError(response, 409, { code: "CONFLICT", message: "Artwork is no longer available", correlationId, retryable: false });
  },
  "POST /v1/artist-artwork/reservations/:id/commit": async ({ url, response, correlationId }) => {
    const id = url.pathname.split("/")[4] ?? "";
    const committed = await commitReservation(id, correlationId);
    return committed ? writeServiceJson(response, 200, { committed: true }, correlationId) : writeServiceError(response, 409, { code: "CONFLICT", message: "Reservation is no longer valid", correlationId, retryable: false });
  },
  "POST /v1/artist-artwork/reservations/:id/release": async ({ url, response, correlationId }) => {
    const id = url.pathname.split("/")[4] ?? "";
    await releaseReservation(id);
    return writeServiceJson(response, 200, { released: true }, correlationId);
  },
};

async function ready() {
  const database = (await ping()) ? ("ok" as const) : ("unavailable" as const);
  return { status: database, dependencies: { database } };
}

createServiceServer({ name: "artist-artwork", version: "v1", port: getPort("ARTIST_ARTWORK_PORT", 4103), health, ready, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("ARTIST_ARTWORK_PORT", 4103));

if (process.env.EVENT_BROKER_URL) {
  runOutboxPublisher({
    schema: "artist_artwork",
    brokerUrl: process.env.EVENT_BROKER_URL,
    exchange: process.env.EVENT_EXCHANGE ?? "atelier.events.v1",
    producer: "artist-artwork",
  });
}

/**
 * Consumes Verification's own ArtworkVerified.v1/ArtistVerified.v1 events
 * (Phase 5, G-22) instead of being PATCHed synchronously — this is what
 * lets Verification persist its decision durably without waiting on this
 * service, and lets a broker/consumer outage retry indefinitely rather
 * than dropping the decision's projection update. Reuses the same
 * correlationId as the triggering event for end-to-end traceability, and
 * calls the same update functions the PATCH routes above still expose, so
 * a re-delivered event is just a repeat of the same idempotent UPDATE.
 */
async function handleVerificationEvent(event: ConsumedEvent): Promise<void> {
  if (event.type === "ArtworkVerified") {
    const artwork = ArtworkVerifiedPayloadSchema.safeParse(event.payload);
    if (artwork.success) await updatePersistedArtworkVerification(artwork.data.artworkId, artwork.data, event.correlationId, { emitEvent: false });
    return;
  }
  if (event.type === "ArtistVerified") {
    const artist = ArtistVerifiedPayloadSchema.safeParse(event.payload);
    if (artist.success) await updatePersistedArtistVerification(artist.data.artistId, artist.data, event.correlationId, { emitEvent: false });
  }
}

if (process.env.EVENT_BROKER_URL) {
  consumeEvents({
    brokerUrl: process.env.EVENT_BROKER_URL,
    exchange: process.env.EVENT_EXCHANGE ?? "atelier.events.v1",
    queue: "atelier.artist-artwork.v1",
    routingKeys: ["artwork.verified", "artist.verified"],
    dedupSchema: "artist_artwork",
    handler: handleVerificationEvent,
  }).catch(() => undefined);
}

// Releases any reservation whose lease expired without a commit/release —
// e.g. a buyer's checkout crashed mid-flow. See releaseExpiredReservations.
setInterval(() => { releaseExpiredReservations().catch(() => undefined); }, Number(process.env.RESERVATION_SWEEP_INTERVAL_MS ?? 30_000));
