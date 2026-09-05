import { listRooms } from "@/lib/gateway/clients/room-preview.client";
import { json } from "@/lib/server/respond";

export async function GET() {
  const rooms = await listRooms();
  return json({ items: rooms, total: rooms.length });
}
