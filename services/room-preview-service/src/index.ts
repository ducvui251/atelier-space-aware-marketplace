import type { ServiceDefinition } from "@atelier/contracts";
export { rooms } from "./infrastructure/rooms";
export { getRoomPresets } from "./application/room-preview";
export { health } from "./health";

export const ROOM_PREVIEW_SERVICE: ServiceDefinition = {
  name: "room-preview",
  version: "v1",
  owns: ["room-presets", "placements", "optional-3d-assets"],
};
