import type { NextRequest } from "next/server";
import { listBuyerRooms, listPlacements } from "@/lib/gateway/clients/room-preview.client";
import { findArtwork } from "@/lib/gateway/clients/artwork.client";
import { getAuthUser } from "@/lib/server/auth";
import { json, errorResponse } from "@/lib/server/respond";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return errorResponse("Unauthorized", 401);

  const rooms = await listBuyerRooms(user.id);
  const items = (
    await Promise.all(
      rooms.map(async (room) => {
        const placements = await listPlacements(room.id);
        const hydrated = await Promise.all(
          placements.map(async (placement) => ({ placement, artwork: await findArtwork(placement.artworkId) })),
        );
        return hydrated.map(({ placement, artwork }) => ({ room, placement, artwork }));
      }),
    )
  ).flat();

  return json({ items, total: items.length });
}
