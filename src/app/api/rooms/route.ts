import { rooms } from "@/data";
import { json } from "@/lib/server/respond";

export async function GET() {
  return json({ items: rooms, total: rooms.length });
}
