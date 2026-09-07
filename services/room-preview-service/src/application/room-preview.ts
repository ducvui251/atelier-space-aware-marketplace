import type { RoomPreset } from "@atelier/contracts";
import { listRoomPresets } from "../domain/room-rules.ts";

export function getRoomPresets(presets: readonly RoomPreset[]): RoomPreset[] {
  return listRoomPresets(presets);
}
