import { listArtists } from "@/lib/gateway/clients/artwork.client";
import { json } from "@/lib/server/respond";

export async function GET() {
  const items = await listArtists();
  return json({ items, total: items.length });
}
