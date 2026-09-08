import type { BuyerRoom, Placement } from "@atelier/contracts";
import { query } from "@atelier/persistence";

/**
 * buyer_id stores the caller-supplied Supabase auth user id directly (same
 * convention as commerce.orders.buyer_id) — Room Preview does not join
 * account.users to resolve it.
 */
type RoomRow = { id: string; buyer_id: string; name: string; room_type: string; wall_color: string | null; image_url: string | null; created_at: string };
type PlacementRow = { id: string; room_id: string; artwork_id: string; scale: string; position_x: string; position_y: string; rotation: string; created_at: string };

function mapRoom(row: RoomRow): BuyerRoom {
  return { id: row.id, buyerId: row.buyer_id, name: row.name, roomType: row.room_type, ...(row.wall_color ? { wallColor: row.wall_color } : {}), ...(row.image_url ? { imageUrl: row.image_url } : {}) , createdAt: row.created_at };
}

function mapPlacement(row: PlacementRow): Placement {
  return { id: row.id, roomId: row.room_id, artworkId: row.artwork_id, scale: Number(row.scale), positionX: Number(row.position_x), positionY: Number(row.position_y), rotation: Number(row.rotation), createdAt: row.created_at };
}

export async function listBuyerRooms(buyerId: string): Promise<BuyerRoom[]> {
  const rows = await query<RoomRow>(
    `select id::text, buyer_id::text, name, room_type, wall_color, image_url, created_at::text
     from room_preview.rooms where buyer_id = $1::uuid order by created_at desc`, [buyerId],
  );
  return rows.map(mapRoom);
}

export async function createBuyerRoom(input: { buyerId: string; name: string; roomType: string; wallColor?: string; imageUrl?: string }): Promise<BuyerRoom> {
  const rows = await query<RoomRow>(
    `insert into room_preview.rooms (buyer_id, name, room_type, wall_color, image_url)
     values ($1::uuid, $2, $3, $4, $5)
     returning id::text, buyer_id::text, name, room_type, wall_color, image_url, created_at::text`,
    [input.buyerId, input.name, input.roomType, input.wallColor ?? null, input.imageUrl ?? null],
  );
  return mapRoom(rows[0]);
}

export async function listPlacements(roomId: string): Promise<Placement[]> {
  const rows = await query<PlacementRow>(
    `select id::text, room_id::text, artwork_id::text, scale::text, position_x::text, position_y::text, rotation::text, created_at::text
     from room_preview.placements where room_id = $1::uuid order by created_at`, [roomId],
  );
  return rows.map(mapPlacement);
}

export async function createPlacement(buyerId: string, input: { roomId: string; artworkId: string; scale?: number; positionX?: number; positionY?: number; rotation?: number }): Promise<Placement | null> {
  const owned = await query<{ id: string }>(`select id::text from room_preview.rooms where id::text = $1 and buyer_id = $2::uuid`, [input.roomId, buyerId]);
  if (!owned[0]) return null;
  const rows = await query<PlacementRow>(
    `insert into room_preview.placements (room_id, artwork_id, scale, position_x, position_y, rotation)
     values ($1::uuid, $2::uuid, $3, $4, $5, $6)
     returning id::text, room_id::text, artwork_id::text, scale::text, position_x::text, position_y::text, rotation::text, created_at::text`,
    [input.roomId, input.artworkId, input.scale ?? 1, input.positionX ?? 0, input.positionY ?? 0, input.rotation ?? 0],
  );
  return mapPlacement(rows[0]);
}

export async function deletePlacement(buyerId: string, roomId: string, placementId: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `delete from room_preview.placements p using room_preview.rooms r
     where p.room_id = r.id and r.buyer_id = $1::uuid and p.room_id::text = $2 and p.id::text = $3
     returning p.id::text`,
    [buyerId, roomId, placementId],
  );
  return Boolean(rows[0]);
}
