import { getRoomPresets, rooms } from "@atelier/room-preview-service";
export async function listRooms() { return getRoomPresets(rooms); }
