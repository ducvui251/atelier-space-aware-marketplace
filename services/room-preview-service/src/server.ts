import { createServiceServer, getPort, writeServiceJson, type ServiceRouteHandler } from "@atelier/config/http";
import { health } from "./health.ts";
import { rooms } from "./infrastructure/rooms.ts";

const routes: Record<string, ServiceRouteHandler> = {
  "GET /v1/room-preview/rooms": ({ response, correlationId }) => writeServiceJson(response, 200, { items: rooms, total: rooms.length }, correlationId),
};

createServiceServer({ name: "room-preview", version: "v1", port: getPort("ROOM_PREVIEW_PORT", 4107), health, routes, internalToken: process.env.ATELIER_INTERNAL_SERVICE_TOKEN }).listen(getPort("ROOM_PREVIEW_PORT", 4107));
