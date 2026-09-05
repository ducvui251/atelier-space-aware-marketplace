import type { NextRequest } from "next/server";
import { searchArtworks } from "@atelier/catalog-discovery-service";
import { ArtworkSearchQuerySchema } from "@atelier/contracts";
import { getServerDb } from "@/lib/gateway/runtime";
import { json } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const db = getServerDb();
  const { searchParams } = new URL(request.url);
  const parsed = ArtworkSearchQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  const items = searchArtworks(db.artworks, parsed.success ? parsed.data : {});

  return json({ items, total: items.length });
}
