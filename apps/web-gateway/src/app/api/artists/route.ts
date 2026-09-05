import { getServerDb } from "@/lib/gateway/runtime";
import { getArtists } from "@atelier/artist-artwork-service";
import { json } from "@/lib/server/respond";

export async function GET() {
  const db = getServerDb();
  const items = getArtists(db.artists);
  return json({ items, total: items.length });
}
