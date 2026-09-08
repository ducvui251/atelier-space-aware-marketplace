import type { ServiceDefinition } from "@atelier/contracts";
export { getRoomPresets } from "./application/room-preview.ts";
export { health } from "./health.ts";

export const ROOM_PREVIEW_SERVICE: ServiceDefinition = {
  name: "room-preview",
  version: "v1",
  owns: ["room-presets", "placements", "optional-3d-assets"],
};
