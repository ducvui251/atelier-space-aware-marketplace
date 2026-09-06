import { createServiceServer, getPort, readJson, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { health } from "./health.ts";
import { createPersistedArtwork, findPersistedArtist, findPersistedArtwork, listPersistedArtistArtworks, listPersistedArtists, listPersistedArtworks, updatePersistedArtwork, updatePersistedAvailability } from "./infrastructure/catalog-repository.ts";

const routes: Record<string, ServiceRouteHandler> = {
  "GET /v1/artist-artwork/artworks": async ({ response, correlationId }) => writeServiceJson(response, 200, { items: await listPersistedArtworks() }, correlationId),
  "GET /v1/artist-artwork/artist/artworks": async ({ url, response, correlationId }) => {
    const artistId = url.searchParams.get("artistId");
    if (!artistId) return writeServiceJson(response, 400, { error: "artistId is required" }, correlationId);
    return writeServiceJson(response, 200, { items: await listPersistedArtistArtworks(artistId) }, correlationId);
  },
  "GET /v1/artist-artwork/artworks/:id": async ({ url, response, correlationId }) => {
    const artwork = await findPersistedArtwork(url.pathname.split("/").pop() ?? "");
    return artwork ? writeServiceJson(response, 200, artwork, correlationId) : writeServiceJson(response, 404, { error: "Artwork not found" }, correlationId);
  },
  "GET /v1/artist-artwork/artists": async ({ response, correlationId }) => writeServiceJson(response, 200, { items: await listPersistedArtists() }, correlationId),
  "GET /v1/artist-artwork/artists/:id": async ({ url, response, correlationId }) => {
    const artist = await findPersistedArtist(url.pathname.split("/").pop() ?? "");
    return artist ? writeServiceJson(response, 200, artist, correlationId) : writeServiceJson(response, 404, { error: "Artist not found" }, correlationId);
  },
  "PATCH /v1/artist-artwork/artworks/:id/availability": async ({ request, url, response, correlationId }) => {
    const body = await readJson<{ availability?: "available" | "reserved" | "sold" }>(request);
    if (!body?.availability) return writeServiceJson(response, 400, { error: "availability is required" }, correlationId);
    const updated = await updatePersistedAvailability(url.pathname.split("/")[4] ?? "", body.availability);
    return updated ? writeServiceJson(response, 200, { availability: body.availability }, correlationId) : writeServiceJson(response, 409, { error: "Artwork is no longer available" }, correlationId);
  },
  "POST /v1/artist-artwork/artworks": async ({ request, response, correlationId }) => {
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return writeServiceJson(response, 400, { error: "A JSON body is required" }, correlationId);
    const required = ["artistId", "title", "medium", "imageUrl"];
    if (required.some((field) => typeof body?.[field] !== "string" || !String(body[field]).trim())) return writeServiceJson(response, 400, { error: "artistId, title, medium, and imageUrl are required" }, correlationId);
    const price = Number(body.price); const widthCm = Number(body.widthCm); const heightCm = Number(body.heightCm);
    if (!(price > 0) || !(widthCm > 0) || !(heightCm > 0)) return writeServiceJson(response, 400, { error: "price, widthCm, and heightCm must be greater than zero" }, correlationId);
    const artwork = await createPersistedArtwork({ artistId: String(body.artistId), title: String(body.title).trim(), medium: String(body.medium).trim(), imageUrl: String(body.imageUrl).trim(), price, widthCm, heightCm, description: typeof body.description === "string" ? body.description : undefined, year: Number(body.year) || new Date().getFullYear(), currency: typeof body.currency === "string" && body.currency ? body.currency : "USD", editionType: body.editionType === "limited-edition" ? "limited-edition" : "original", orientation: body.orientation === "landscape" || body.orientation === "square" ? body.orientation : "portrait", dominantColors: Array.isArray(body.dominantColors) ? body.dominantColors.filter((value): value is string => typeof value === "string") : [], style: Array.isArray(body.style) ? body.style.filter((value): value is string => typeof value === "string") : [] });
    return writeServiceJson(response, 201, artwork, correlationId);
  },
  "PATCH /v1/artist-artwork/artworks/:id": async ({ request, url, response, correlationId }) => {
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return writeServiceJson(response, 400, { error: "A JSON body is required" }, correlationId);
    if (body?.title !== undefined && !String(body.title).trim()) return writeServiceJson(response, 400, { error: "title cannot be empty" }, correlationId);
    if (body?.price !== undefined && !(Number(body.price) > 0)) return writeServiceJson(response, 400, { error: "price must be greater than zero" }, correlationId);
    const artwork = await updatePersistedArtwork(url.pathname.split("/").pop() ?? "", { title: typeof body?.title === "string" ? body.title.trim() : undefined, description: typeof body?.description === "string" ? body.description : undefined, medium: typeof body?.medium === "string" ? body.medium : undefined, price: body?.price === undefined ? undefined : Number(body.price), widthCm: body?.widthCm === undefined ? undefined : Number(body.widthCm), heightCm: body?.heightCm === undefined ? undefined : Number(body.heightCm), year: body?.year === undefined ? undefined : Number(body.year), currency: typeof body?.currency === "string" ? body.currency : undefined, orientation: body?.orientation === "landscape" || body?.orientation === "square" || body?.orientation === "portrait" ? body.orientation : undefined, dominantColors: Array.isArray(body?.dominantColors) ? body.dominantColors.filter((value): value is string => typeof value === "string") : undefined, style: Array.isArray(body?.style) ? body.style.filter((value): value is string => typeof value === "string") : undefined });
    return artwork ? writeServiceJson(response, 200, artwork, correlationId) : writeServiceJson(response, 404, { error: "Artwork not found" }, correlationId);
  },
};

createServiceServer({ name: "artist-artwork", version: "v1", port: getPort("ARTIST_ARTWORK_PORT", 4103), health, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("ARTIST_ARTWORK_PORT", 4103));
