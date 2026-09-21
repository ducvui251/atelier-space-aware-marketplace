import type { NextRequest } from "next/server";
import { listAllArtworksForAdmin, listArtistArtworks } from "@/lib/gateway/clients/artwork.client";
import { exhibitionServiceError, requireExhibitionActor } from "@/lib/server/exhibition-access";
import { json } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const access = await requireExhibitionActor(request);
  if (!access.ok) return access.response;
  try {
    if (access.actor.role === "artist") {
      const q = new URL(request.url).searchParams.get("q") ?? undefined;
      const result = await listArtistArtworks(access.actor.id, { q });
      return json({ items: result.items, total: result.total ?? result.items.length });
    }
    const items = await listAllArtworksForAdmin();
    return json({ items, total: items.length });
  } catch (error) {
    return exhibitionServiceError(error);
  }
}
