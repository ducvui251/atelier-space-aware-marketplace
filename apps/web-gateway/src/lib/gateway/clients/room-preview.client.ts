import type { RoomPreset } from "@atelier/contracts";
import { rooms as buildRooms } from "@atelier/room-preview-service";
import { requestService } from "../http-client";

export async function listRooms(): Promise<RoomPreset[]> {
  if (process.env.NEXT_PHASE === "phase-production-build") return buildRooms;
  return (await requestService<{ items: RoomPreset[]; total: number }>("room-preview", "/v1/room-preview/rooms")).items;
}
