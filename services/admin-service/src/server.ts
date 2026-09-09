import { createServiceServer, getPort, readJson, writeServiceError, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { CreateComplaintRequestSchema, ResolveComplaintRequestSchema, parseBody } from "@atelier/contracts";
import { OrderCreatedPayloadSchema, OrderShippedPayloadSchema, PaymentSucceededPayloadSchema } from "@atelier/contracts/events";
import { consumeEvents, type ConsumedEvent } from "@atelier/events";
import { ping } from "@atelier/persistence";
import { health } from "./health.ts";
import { createComplaint, getStats, listComplaints, markOrderFeedPaid, markOrderFeedShipped, resolveComplaint, upsertOrderFeedCreated } from "./infrastructure/admin-repository.ts";

async function source<T>(path: string): Promise<T> {
  const baseUrl = process.env.ARTIST_ARTWORK_SERVICE_URL ?? "http://localhost:4103";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, { headers: process.env.ATELIER_INTERNAL_SERVICE_TOKEN ? { "x-service-token": process.env.ATELIER_INTERNAL_SERVICE_TOKEN } : {} });
  if (!response.ok) throw new Error(`Artist artwork service returned ${response.status}`);
  return response.json() as Promise<T>;
}

const routes: Record<string, ServiceRouteHandler> = {
  "GET /v1/admin/verification-queue": async ({ response, correlationId }) => {
    const [artists, artworks] = await Promise.all([source<{ items: Array<{ verificationStatus: string }> }>("/v1/artist-artwork/artists"), source<{ items: Array<{ verificationStatus: string }> }>("/v1/artist-artwork/artworks")]);
    return writeServiceJson(response, 200, { artists: artists.items.filter((item) => item.verificationStatus === "pending"), artworks: artworks.items.filter((item) => item.verificationStatus === "pending") }, correlationId);
  },
  "GET /v1/admin/stats": async ({ response, correlationId }) => writeServiceJson(response, 200, await getStats(), correlationId),
  "GET /v1/admin/complaints": async ({ response, correlationId }) => { const items = await listComplaints(); return writeServiceJson(response, 200, { items, total: items.length }, correlationId); },
  "POST /v1/admin/complaints": async ({ request, response, correlationId }) => {
    const parsed = parseBody(CreateComplaintRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    return writeServiceJson(response, 201, await createComplaint({ authUserId: parsed.data.reporterId, orderId: parsed.data.orderId, reason: parsed.data.reason, evidenceUrl: parsed.data.evidenceUrl }), correlationId);
  },
  "POST /v1/admin/complaints/:id/resolve": async ({ request, url, response, correlationId }) => {
    const parsed = parseBody(ResolveComplaintRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const complaint = await resolveComplaint(url.pathname.split("/")[4] ?? "", parsed.data.status, parsed.data.note);
    return complaint ? writeServiceJson(response, 200, complaint, correlationId) : writeServiceError(response, 404, { code: "NOT_FOUND", message: "Complaint not found", correlationId, retryable: false });
  },
};

async function ready() {
  const database = (await ping()) ? ("ok" as const) : ("unavailable" as const);
  return { status: database, dependencies: { database } };
}

createServiceServer({ name: "admin", version: "v1", port: getPort("ADMIN_PORT", 4108), health, ready, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("ADMIN_PORT", 4108));

/**
 * Admin never re-publishes under either type after applying them (no
 * writeOutboxEvent call here), so unlike the earlier G-22 path there is no
 * risk of this consumer feeding its own queue.
 *
 * Dispatches on `event.type` first, not payload-shape matching: confirmed
 * live that PaymentSucceeded's payload (orderId/buyerId/artworkId/amount/
 * currency/paymentId) is a strict superset of OrderCreated's fields, so
 * `OrderCreatedPayloadSchema.safeParse` on a PaymentSucceeded payload
 * returns success too (Zod object schemas accept extra keys by default) —
 * every real payment was silently mis-routed to the OrderCreated branch
 * before this was caught (order_feed stuck at "pending" despite a
 * genuinely paid order).
 */
async function handleCommerceEvent(event: ConsumedEvent): Promise<void> {
  if (event.type === "OrderCreated") {
    const created = OrderCreatedPayloadSchema.safeParse(event.payload);
    if (created.success) await upsertOrderFeedCreated(created.data);
    return;
  }
  if (event.type === "PaymentSucceeded") {
    const paid = PaymentSucceededPayloadSchema.safeParse(event.payload);
    if (paid.success) await markOrderFeedPaid(paid.data);
    return;
  }
  if (event.type === "OrderShipped") {
    const shipped = OrderShippedPayloadSchema.safeParse(event.payload);
    if (shipped.success) await markOrderFeedShipped(shipped.data);
  }
}

if (process.env.EVENT_BROKER_URL) {
  consumeEvents({
    brokerUrl: process.env.EVENT_BROKER_URL,
    exchange: process.env.EVENT_EXCHANGE ?? "atelier.events.v1",
    queue: "atelier.admin.v1",
    routingKeys: ["order.created", "payment.succeeded", "order.shipped"],
    dedupSchema: "admin",
    handler: handleCommerceEvent,
  }).catch(() => undefined);
}
