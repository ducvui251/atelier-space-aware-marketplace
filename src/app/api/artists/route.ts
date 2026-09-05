import { getServerDb } from "@/lib/server/store";
import { json } from "@/lib/server/respond";

export async function GET() {
  const db = getServerDb();
  return json({ items: db.artists, total: db.artists.length });
}
