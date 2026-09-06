import { createServiceServer, getPort, readJson, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { CheckoutRequestSchema, type Artwork } from "@atelier/contracts";
import { health } from "./health.ts";
import { addCartItem, listCart, removeCartItem } from "./infrastructure/cart-repository.ts";
import { persistCheckout } from "./infrastructure/commerce-repository.ts";
import { listOrders } from "./infrastructure/order-repository.ts";
import { confirmReceived, listArtistOrders, saveReview, shipOrder } from "./infrastructure/order-actions-repository.ts";

async function sourceArtworks(): Promise<Artwork[]> {
  const baseUrl = process.env.ARTIST_ARTWORK_SERVICE_URL ?? "http://localhost:4103";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/artist-artwork/artworks`, {
    headers: process.env.ATELIER_INTERNAL_SERVICE_TOKEN ? { "x-service-token": process.env.ATELIER_INTERNAL_SERVICE_TOKEN } : {},
  });
  if (!response.ok) throw new Error(`Artist artwork service returned ${response.status}`);
  return ((await response.json()) as { items?: Artwork[] }).items ?? [];
}

async function setAvailability(artworkId: string, availability: "available" | "sold") {
  const baseUrl = process.env.ARTIST_ARTWORK_SERVICE_URL ?? "http://localhost:4103";
  await fetch(`${baseUrl.replace(/\/$/, "")}/v1/artist-artwork/artworks/${encodeURIComponent(artworkId)}/availability`, {
    method: "PATCH", headers: { "content-type": "application/json", ...(process.env.ATELIER_INTERNAL_SERVICE_TOKEN ? { "x-service-token": process.env.ATELIER_INTERNAL_SERVICE_TOKEN } : {}) },
    body: JSON.stringify({ availability }),
  });
}

const routes: Record<string, ServiceRouteHandler> = {
  "GET /v1/commerce/cart": async ({ url, response, correlationId }) => {
    const buyerId = url.searchParams.get("buyerId");
    if (!buyerId) return writeServiceJson(response, 400, { error: "buyerId is required" }, correlationId);
    const artworkIds = await listCart(buyerId);
    return writeServiceJson(response, 200, { artworkIds }, correlationId);
  },
  "POST /v1/commerce/cart": async ({ request, response, correlationId }) => {
    const body = await readJson<{ buyerId?: string; artworkId?: string }>(request);
    if (!body?.buyerId || !body.artworkId) return writeServiceJson(response, 400, { error: "buyerId and artworkId are required" }, correlationId);
    return writeServiceJson(response, 201, { artworkIds: await addCartItem(body.buyerId, body.artworkId) }, correlationId);
  },
  "DELETE /v1/commerce/cart/:artworkId": async ({ request, url, response, correlationId }) => {
    const buyerId = url.searchParams.get("buyerId");
    const artworkId = url.pathname.split("/").pop();
    if (!buyerId || !artworkId) return writeServiceJson(response, 400, { error: "buyerId and artworkId are required" }, correlationId);
    return writeServiceJson(response, 200, { artworkIds: await removeCartItem(buyerId, artworkId) }, correlationId);
  },
  "POST /v1/commerce/checkout": async ({ request, url, response, correlationId }) => {
    const body = await readJson<Record<string, unknown>>(request);
    const parsed = CheckoutRequestSchema.safeParse(body);
    const buyerId = typeof body?.buyerId === "string" ? body.buyerId : "";
    if (!buyerId || !parsed.success) return writeServiceJson(response, 400, { error: "buyerId and a valid checkout request are required" }, correlationId);
    const artworkIds = await listCart(buyerId);
    const source = await sourceArtworks();
    const items = artworkIds.map((id) => source.find((artwork) => artwork.id === id)).filter((item): item is Artwork => Boolean(item));
    if (items.length !== artworkIds.length) return writeServiceJson(response, 409, { error: "Artwork is no longer available" }, correlationId);
    if (items.some((item) => item.availability !== "available")) return writeServiceJson(response, 409, { error: "Artwork is no longer available" }, correlationId);
    const reserved: string[] = [];
    for (const item of items) {
      const baseUrl = process.env.ARTIST_ARTWORK_SERVICE_URL ?? "http://localhost:4103";
      const reserve = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/artist-artwork/artworks/${encodeURIComponent(item.id)}/availability`, {
        method: "PATCH", headers: { "content-type": "application/json", ...(process.env.ATELIER_INTERNAL_SERVICE_TOKEN ? { "x-service-token": process.env.ATELIER_INTERNAL_SERVICE_TOKEN } : {}) }, body: JSON.stringify({ availability: "sold" }),
      });
      if (!reserve.ok) { await Promise.all(reserved.map((id) => setAvailability(id, "available"))); return writeServiceJson(response, 409, { error: "Artwork is no longer available" }, correlationId); }
      reserved.push(item.id);
    }
    try {
      const orders = await persistCheckout({ authUserId: buyerId, items: items.map((item) => ({ artworkId: item.id, editionType: item.editionType, totalAmount: item.price, currency: item.currency })), shippingAddress: parsed.data.shippingAddress, method: parsed.data.method, idempotencyKey: request.headers["idempotency-key"]?.toString() ?? correlationId });
      return writeServiceJson(response, 201, { orders }, correlationId);
    } catch (error) {
      await Promise.all(reserved.map((id) => setAvailability(id, "available")));
      throw error;
    }
  },
  "GET /v1/commerce/orders": async ({ url, response, correlationId }) => {
    const buyerId = url.searchParams.get("buyerId");
    if (!buyerId) return writeServiceJson(response, 400, { error: "buyerId is required" }, correlationId);
    const items = await listOrders(buyerId);
    return writeServiceJson(response, 200, { items, total: items.length }, correlationId);
  },
  "GET /v1/commerce/artist-orders": async ({ url, response, correlationId }) => {
    const artistId = url.searchParams.get("artistId");
    if (!artistId) return writeServiceJson(response, 400, { error: "artistId is required" }, correlationId);
    const items = await listArtistOrders(artistId);
    return writeServiceJson(response, 200, { items, total: items.length }, correlationId);
  },
  "POST /v1/commerce/orders/:id/ship": async ({ request, url, response, correlationId }) => {
    const body = await readJson<{ artistId?: string; carrier?: string; trackingNumber?: string }>(request);
    if (!body?.artistId || !body.carrier?.trim() || !body.trackingNumber?.trim()) return writeServiceJson(response, 400, { error: "artistId, carrier, and trackingNumber are required" }, correlationId);
    const shipment = await shipOrder(url.pathname.split("/")[4] ?? "", body.artistId, { carrier: body.carrier.trim(), trackingNumber: body.trackingNumber.trim() });
    return shipment ? writeServiceJson(response, 200, shipment, correlationId) : writeServiceJson(response, 403, { error: "This order does not belong to the artist" }, correlationId);
  },
  "POST /v1/commerce/orders/:id/confirm-received": async ({ request, url, response, correlationId }) => {
    const body = await readJson<{ buyerId?: string }>(request);
    const order = body?.buyerId ? await confirmReceived(url.pathname.split("/")[4] ?? "", body.buyerId) : null;
    return order ? writeServiceJson(response, 200, order, correlationId) : writeServiceJson(response, 409, { error: "Order must be shipped and belong to the buyer" }, correlationId);
  },
  "POST /v1/commerce/orders/:id/reviews": async ({ request, url, response, correlationId }) => {
    const body = await readJson<{ buyerId?: string; rating?: number; comment?: string }>(request);
    if (!body?.buyerId || typeof body.rating !== "number" || body.rating < 1 || body.rating > 5) return writeServiceJson(response, 400, { error: "buyerId and rating 1-5 are required" }, correlationId);
    const review = await saveReview({ orderId: url.pathname.split("/")[4] ?? "", authUserId: body.buyerId, rating: body.rating, comment: body.comment });
    return review ? writeServiceJson(response, 200, review, correlationId) : writeServiceJson(response, 409, { error: "Order cannot be reviewed" }, correlationId);
  },
};

createServiceServer({ name: "commerce", version: "v1", port: getPort("COMMERCE_PORT", 4104), health, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("COMMERCE_PORT", 4104));
