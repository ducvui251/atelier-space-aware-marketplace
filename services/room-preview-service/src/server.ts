import { createServiceServer, getPort, readJson, writeServiceError, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { CreateBuyerRoomRequestSchema, CreatePlacementRequestSchema, parseBody } from "@atelier/contracts";
import { ping } from "@atelier/persistence";
import { health } from "./health.ts";
import { rooms } from "./infrastructure/rooms.ts";
import { createBuyerRoom, createPlacement, deletePlacement, listBuyerRooms, listPlacements } from "./infrastructure/room-repository.ts";

const routes: Record<string, ServiceRouteHandler> = {
  "GET /v1/room-preview/rooms": async ({ url, response, correlationId }) => {
    const buyerId = url.searchParams.get("buyerId");
    if (!buyerId) return writeServiceJson(response, 200, { items: rooms, total: rooms.length }, correlationId);
    const items = await listBuyerRooms(buyerId);
    return writeServiceJson(response, 200, { items, total: items.length }, correlationId);
  },
  "POST /v1/room-preview/rooms": async ({ request, response, correlationId }) => {
    const parsed = parseBody(CreateBuyerRoomRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field });
    const room = await createBuyerRoom(parsed.data);
    return writeServiceJson(response, 201, room, correlationId);
  },
  "GET /v1/room-preview/rooms/:id/placements": async ({ url, response, correlationId }) => {
    const roomId = url.pathname.split("/")[4] ?? "";
    const items = await listPlacements(roomId);
    return writeServiceJson(response, 200, { items, total: items.length }, correlationId);
  },
  "POST /v1/room-preview/rooms/:id/placements": async ({ request, url, response, correlationId }) => {
    const roomId = url.pathname.split("/")[4] ?? "";
    const parsed = parseBody(CreatePlacementRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field });
    const { buyerId, ...placementInput } = parsed.data;
    const placement = await createPlacement(buyerId, { roomId, ...placementInput });
    return placement ? writeServiceJson(response, 201, placement, correlationId) : writeServiceError(response, 404, { code: "NOT_FOUND", message: "Room not found", correlationId });
  },
  "DELETE /v1/room-preview/rooms/:id/placements/:placementId": async ({ url, response, correlationId }) => {
    const buyerId = url.searchParams.get("buyerId");
    const parts = url.pathname.split("/");
    const roomId = parts[4] ?? "";
    const placementId = parts[6] ?? "";
    if (!buyerId) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "buyerId is required", correlationId, field: "buyerId" });
    const removed = await deletePlacement(buyerId, roomId, placementId);
    return removed ? writeServiceJson(response, 200, { removed: true }, correlationId) : writeServiceError(response, 404, { code: "NOT_FOUND", message: "Placement not found", correlationId });
  },
};

async function ready() {
  const database = (await ping()) ? ("ok" as const) : ("unavailable" as const);
  return { status: database, dependencies: { database } };
}

createServiceServer({ name: "room-preview", version: "v1", port: getPort("ROOM_PREVIEW_PORT", 4107), health, ready, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("ROOM_PREVIEW_PORT", 4107));
