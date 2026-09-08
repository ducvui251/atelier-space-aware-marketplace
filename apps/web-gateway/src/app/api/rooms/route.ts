import type { NextRequest } from "next/server";
import { createBuyerRoom, listRooms } from "@/lib/gateway/clients/room-preview.client";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET() {
  const rooms = await listRooms();
  return json({ items: rooms, total: rooms.length });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const roomType = typeof body?.roomType === "string" ? body.roomType.trim() : "";
  if (!name || !roomType) return errorResponse("name and roomType are required", 400);

  try {
    const room = await createBuyerRoom({ buyerId: user.id, name, roomType, imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined });
    return json(room, 201);
  } catch {
    return errorResponse("Room could not be saved", 409);
  }
}
