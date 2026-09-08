import type { BuyerRoom, Placement, RoomPreset } from "@atelier/contracts";
import { requestService } from "../http-client";

export async function listRooms(): Promise<RoomPreset[]> {
  return (await requestService<{ items: RoomPreset[]; total: number }>("room-preview", "/v1/room-preview/rooms")).items;
}

export async function listBuyerRooms(buyerId: string): Promise<BuyerRoom[]> {
  return (await requestService<{ items: BuyerRoom[]; total: number }>("room-preview", `/v1/room-preview/rooms?buyerId=${encodeURIComponent(buyerId)}`)).items;
}

export async function createBuyerRoom(input: { buyerId: string; name: string; roomType: string; wallColor?: string; imageUrl?: string }): Promise<BuyerRoom> {
  return requestService<BuyerRoom>("room-preview", "/v1/room-preview/rooms", { method: "POST", body: input });
}

export async function listPlacements(roomId: string): Promise<Placement[]> {
  return (await requestService<{ items: Placement[]; total: number }>("room-preview", `/v1/room-preview/rooms/${encodeURIComponent(roomId)}/placements`)).items;
}

export async function createPlacement(roomId: string, input: { buyerId: string; artworkId: string; scale?: number; positionX?: number; positionY?: number; rotation?: number }): Promise<Placement> {
  return requestService<Placement>("room-preview", `/v1/room-preview/rooms/${encodeURIComponent(roomId)}/placements`, { method: "POST", body: input });
}

export async function deletePlacement(roomId: string, placementId: string, buyerId: string): Promise<{ removed: boolean }> {
  return requestService<{ removed: boolean }>("room-preview", `/v1/room-preview/rooms/${encodeURIComponent(roomId)}/placements/${encodeURIComponent(placementId)}?buyerId=${encodeURIComponent(buyerId)}`, { method: "DELETE" });
}
