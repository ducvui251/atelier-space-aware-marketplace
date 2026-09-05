import type { RoomPreset } from "@atelier/contracts";

export function listRoomPresets(presets: readonly RoomPreset[]): RoomPreset[] {
  return [...presets];
}
