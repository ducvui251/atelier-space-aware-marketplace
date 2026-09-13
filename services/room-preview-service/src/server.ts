import { createServiceServer, getPort, readJson, writeServiceError, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import {
  CreateBuyerRoomRequestSchema,
  CreateExhibitionPlacementRequestSchema,
  CreateExhibitionRequestSchema,
  CreatePlacementRequestSchema,
  UpdateExhibitionPlacementRequestSchema,
  UpdateExhibitionRequestSchema,
  parseBody,
} from "@atelier/contracts";
import { ping } from "@atelier/persistence";
import { health } from "./health.ts";
import { rooms } from "./infrastructure/rooms.ts";
import { createBuyerRoom, createPlacement, deletePlacement, listBuyerRooms, listPlacements } from "./infrastructure/room-repository.ts";
import {
  canManageExhibition,
  canUseArtwork,
  createExhibition,
  createExhibitionPlacement,
  deleteExhibition,
  deleteExhibitionPlacement,
  findExhibitionById,
  listExhibitionPlacements,
  listExhibitions,
  updateExhibition,
  updateExhibitionPlacement,
} from "./infrastructure/exhibition-repository.ts";

function requireActorFromQuery(url: URL): { id: string; role: "artist" | "admin" } | null {
  const id = url.searchParams.get("requesterId");
  const role = url.searchParams.get("requesterRole");
  if (!id || (role !== "artist" && role !== "admin")) return null;
  return { id, role };
}

const routes: Record<string, ServiceRouteHandler> = {
  "GET /v1/room-preview/rooms": async ({ url, response, correlationId }) => {
    const buyerId = url.searchParams.get("buyerId");
    if (!buyerId) return writeServiceJson(response, 200, { items: rooms, total: rooms.length }, correlationId);
    const items = await listBuyerRooms(buyerId);
    return writeServiceJson(response, 200, { items, total: items.length }, correlationId);
  },
  "POST /v1/room-preview/rooms": async ({ request, response, correlationId }) => {
    const parsed = parseBody(CreateBuyerRoomRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
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
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const { buyerId, ...placementInput } = parsed.data;
    const placement = await createPlacement(buyerId, { roomId, ...placementInput });
    return placement ? writeServiceJson(response, 201, placement, correlationId) : writeServiceError(response, 404, { code: "NOT_FOUND", message: "Room not found", correlationId, retryable: false });
  },
  "DELETE /v1/room-preview/rooms/:id/placements/:placementId": async ({ url, response, correlationId }) => {
    const buyerId = url.searchParams.get("buyerId");
    const parts = url.pathname.split("/");
    const roomId = parts[4] ?? "";
    const placementId = parts[6] ?? "";
    if (!buyerId) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "buyerId is required", correlationId, field: "buyerId", retryable: false });
    const removed = await deletePlacement(buyerId, roomId, placementId);
    return removed ? writeServiceJson(response, 200, { removed: true }, correlationId) : writeServiceError(response, 404, { code: "NOT_FOUND", message: "Placement not found", correlationId, retryable: false });
  },

  "GET /v1/room-preview/exhibitions": async ({ url, response, correlationId }) => {
    const items = await listExhibitions({
      creatorId: url.searchParams.get("creatorId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    return writeServiceJson(response, 200, { items, total: items.length }, correlationId);
  },
  "POST /v1/room-preview/exhibitions": async ({ request, response, correlationId }) => {
    const parsed = parseBody(CreateExhibitionRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const exhibition = await createExhibition(parsed.data);
    return exhibition
      ? writeServiceJson(response, 201, exhibition, correlationId)
      : writeServiceError(response, 409, { code: "CONFLICT", message: "That slug is already in use", correlationId, field: "slug", retryable: false });
  },
  "GET /v1/room-preview/exhibitions/:id": async ({ url, response, correlationId }) => {
    const id = url.pathname.split("/")[4] ?? "";
    const exhibition = await findExhibitionById(id);
    return exhibition
      ? writeServiceJson(response, 200, exhibition, correlationId)
      : writeServiceError(response, 404, { code: "NOT_FOUND", message: "Exhibition not found", correlationId, retryable: false });
  },
  "PATCH /v1/room-preview/exhibitions/:id": async ({ request, url, response, correlationId }) => {
    const id = url.pathname.split("/")[4] ?? "";
    const parsed = parseBody(UpdateExhibitionRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const existing = await findExhibitionById(id);
    if (!existing) return writeServiceError(response, 404, { code: "NOT_FOUND", message: "Exhibition not found", correlationId, retryable: false });
    const { requesterId, requesterRole, ...patch } = parsed.data;
    if (!canManageExhibition(existing, { id: requesterId, role: requesterRole })) {
      return writeServiceError(response, 403, { code: "FORBIDDEN", message: "You do not have permission to edit this exhibition", correlationId, retryable: false });
    }
    const updated = await updateExhibition(id, patch);
    return updated
      ? writeServiceJson(response, 200, updated, correlationId)
      : writeServiceError(response, 409, { code: "CONFLICT", message: "That slug is already in use", correlationId, field: "slug", retryable: false });
  },
  "DELETE /v1/room-preview/exhibitions/:id": async ({ url, response, correlationId }) => {
    const id = url.pathname.split("/")[4] ?? "";
    const actor = requireActorFromQuery(url);
    if (!actor) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "requesterId and requesterRole are required", correlationId, retryable: false });
    const existing = await findExhibitionById(id);
    if (!existing) return writeServiceError(response, 404, { code: "NOT_FOUND", message: "Exhibition not found", correlationId, retryable: false });
    if (!canManageExhibition(existing, actor)) {
      return writeServiceError(response, 403, { code: "FORBIDDEN", message: "You do not have permission to delete this exhibition", correlationId, retryable: false });
    }
    const removed = await deleteExhibition(id);
    return writeServiceJson(response, 200, { removed }, correlationId);
  },
  "GET /v1/room-preview/exhibitions/:id/placements": async ({ url, response, correlationId }) => {
    const id = url.pathname.split("/")[4] ?? "";
    const exhibition = await findExhibitionById(id);
    if (!exhibition) return writeServiceError(response, 404, { code: "NOT_FOUND", message: "Exhibition not found", correlationId, retryable: false });
    const items = await listExhibitionPlacements(id);
    return writeServiceJson(response, 200, { items, total: items.length }, correlationId);
  },
  "POST /v1/room-preview/exhibitions/:id/placements": async ({ request, url, response, correlationId }) => {
    const id = url.pathname.split("/")[4] ?? "";
    const parsed = parseBody(CreateExhibitionPlacementRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const exhibition = await findExhibitionById(id);
    if (!exhibition) return writeServiceError(response, 404, { code: "NOT_FOUND", message: "Exhibition not found", correlationId, retryable: false });
    const { requesterId, requesterRole, ...placementInput } = parsed.data;
    const actor = { id: requesterId, role: requesterRole };
    if (!canManageExhibition(exhibition, actor)) {
      return writeServiceError(response, 403, { code: "FORBIDDEN", message: "You do not have permission to edit this exhibition", correlationId, retryable: false });
    }
    if (!(await canUseArtwork(placementInput.artworkId, actor, correlationId))) {
      return writeServiceError(response, 403, { code: "FORBIDDEN", message: "You may only place your own artworks", correlationId, field: "artworkId", retryable: false });
    }
    const placement = await createExhibitionPlacement(id, placementInput);
    return writeServiceJson(response, 201, placement, correlationId);
  },
  "PATCH /v1/room-preview/exhibitions/:id/placements/:placementId": async ({ request, url, response, correlationId }) => {
    const parts = url.pathname.split("/");
    const id = parts[4] ?? "";
    const placementId = parts[6] ?? "";
    const parsed = parseBody(UpdateExhibitionPlacementRequestSchema, await readJson(request));
    if (!parsed.success) return writeServiceError(response, 400, { code: parsed.code, message: parsed.message, correlationId, field: parsed.field, retryable: false });
    const exhibition = await findExhibitionById(id);
    if (!exhibition) return writeServiceError(response, 404, { code: "NOT_FOUND", message: "Exhibition not found", correlationId, retryable: false });
    const { requesterId, requesterRole, ...patch } = parsed.data;
    if (!canManageExhibition(exhibition, { id: requesterId, role: requesterRole })) {
      return writeServiceError(response, 403, { code: "FORBIDDEN", message: "You do not have permission to edit this exhibition", correlationId, retryable: false });
    }
    const updated = await updateExhibitionPlacement(id, placementId, patch);
    return updated
      ? writeServiceJson(response, 200, updated, correlationId)
      : writeServiceError(response, 404, { code: "NOT_FOUND", message: "Placement not found", correlationId, retryable: false });
  },
  "DELETE /v1/room-preview/exhibitions/:id/placements/:placementId": async ({ url, response, correlationId }) => {
    const parts = url.pathname.split("/");
    const id = parts[4] ?? "";
    const placementId = parts[6] ?? "";
    const actor = requireActorFromQuery(url);
    if (!actor) return writeServiceError(response, 400, { code: "VALIDATION_ERROR", message: "requesterId and requesterRole are required", correlationId, retryable: false });
    const exhibition = await findExhibitionById(id);
    if (!exhibition) return writeServiceError(response, 404, { code: "NOT_FOUND", message: "Exhibition not found", correlationId, retryable: false });
    if (!canManageExhibition(exhibition, actor)) {
      return writeServiceError(response, 403, { code: "FORBIDDEN", message: "You do not have permission to edit this exhibition", correlationId, retryable: false });
    }
    const removed = await deleteExhibitionPlacement(id, placementId);
    return removed
      ? writeServiceJson(response, 200, { removed: true }, correlationId)
      : writeServiceError(response, 404, { code: "NOT_FOUND", message: "Placement not found", correlationId, retryable: false });
  },
};

async function ready() {
  const database = (await ping()) ? ("ok" as const) : ("unavailable" as const);
  return { status: database, dependencies: { database } };
}

createServiceServer({ name: "room-preview", version: "v1", port: getPort("ROOM_PREVIEW_PORT", 4107), health, ready, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("ROOM_PREVIEW_PORT", 4107));
